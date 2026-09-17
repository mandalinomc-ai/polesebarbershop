import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { occupiesSlot } from "@/lib/appointments";
import { SHOP_HOURS } from "@/lib/catalog";
import { formatWallDate, formatWallTime, wallTimeToUtc } from "@/lib/availability";

export const CONFLICT_NOTE = "[Da confermare: ex Davide — orario già occupato da Felice]";
let maintenanceStarted = false;

export type SoloFeliceMigrateResult = {
  moved: number;
  conflictsPending: number;
  subscriptions: number;
  blocks: number;
  davideDeactivated: boolean;
  viaRpc: boolean;
  remainingDavide: number;
};

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const as = new Date(aStart).getTime();
  const ae = new Date(aEnd).getTime();
  const bs = new Date(bStart).getTime();
  const be = new Date(bEnd).getTime();
  if (![as, ae, bs, be].every(Number.isFinite)) return false;
  return as < be && bs < ae;
}

function romeWeekdayNum(d: Date): number {
  const short = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Rome",
    weekday: "short",
  }).format(d);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[short] ?? d.getDay();
}

/** First free gap on Felice that day (15-min grid), skipping lunch 13–14. */
export function findHoldingSlot(
  day: string,
  durationMin: number,
  busy: Array<{ starts_at: string; ends_at: string }>,
): { starts_at: string; ends_at: string } | null {
  const hours = SHOP_HOURS[romeWeekdayNum(new Date(`${day}T12:00:00+02:00`))];
  if (!hours) return null;
  const [oH, oM] = hours.open.split(":").map(Number);
  const [cH, cM] = hours.close.split(":").map(Number);
  let cursor = (oH || 0) * 60 + (oM || 0);
  const closeMin = (cH || 0) * 60 + (cM || 0);
  const dur = Math.max(5, durationMin);
  while (cursor + dur <= closeMin) {
    const endMin = cursor + dur;
    // skip lunch 13:00–14:00
    if (!(endMin <= 13 * 60 || cursor >= 14 * 60)) {
      cursor += 15;
      continue;
    }
    const hh = String(Math.floor(cursor / 60)).padStart(2, "0");
    const mm = String(cursor % 60).padStart(2, "0");
    const starts_at = wallTimeToUtc(day, `${hh}:${mm}`).toISOString();
    const ends_at = new Date(new Date(starts_at).getTime() + dur * 60_000).toISOString();
    const hit = busy.some((b) => rangesOverlap(starts_at, ends_at, b.starts_at, b.ends_at));
    if (!hit) return { starts_at, ends_at };
    cursor += 15;
  }
  return null;
}

/**
 * Idempotent: move Davide → Felice.
 * Free slots keep status; overlaps → pending on Felice in a free holding slot
 * (original time kept in notes) so staff can resolve without SQL ALTER.
 */
export async function runSoloFeliceMigration(): Promise<SoloFeliceMigrateResult> {
  const result: SoloFeliceMigrateResult = {
    moved: 0,
    conflictsPending: 0,
    subscriptions: 0,
    blocks: 0,
    davideDeactivated: false,
    viaRpc: false,
    remainingDavide: 0,
  };
  if (!isSupabaseConfigured()) return result;

  const db = getSupabaseAdmin();
  if (!db) return result;

  if (!maintenanceStarted) {
    const rpc = await db.rpc("migrate_davide_to_felice");
    if (!rpc.error && rpc.data && typeof rpc.data === "object") {
      maintenanceStarted = true;
      const data = rpc.data as Partial<SoloFeliceMigrateResult>;
      return {
        moved: Number(data.moved) || 0,
        conflictsPending: Number(data.conflictsPending) || 0,
        subscriptions: Number(data.subscriptions) || 0,
        blocks: Number(data.blocks) || 0,
        davideDeactivated: Boolean(data.davideDeactivated),
        viaRpc: true,
        remainingDavide: Number(data.remainingDavide) || 0,
      };
    }
  }

  const { data: davideRows, error: dErr } = await db
    .from("appointments")
    .select("id, barber_id, starts_at, ends_at, status, notes")
    .eq("barber_id", "davide");

  if (dErr) return result;
  if (!davideRows?.length) {
    maintenanceStarted = true;
    await deactivateDavide(db, result);
    await migrateSubsAndBlocks(db, result);
    return result;
  }

  const { data: feliceRows } = await db
    .from("appointments")
    .select("id, starts_at, ends_at, status")
    .eq("barber_id", "felice")
    .in("status", ["pending", "confirmed", "walk_in", "completed"]);

  const feliceBusy = (feliceRows || []).filter((r) => occupiesSlot(r.status)) as Array<{
    id: string;
    starts_at: string;
    ends_at: string;
    status: string;
  }>;

  for (const row of davideRows as Array<{
    id: string;
    starts_at: string;
    ends_at: string;
    status: string;
    notes: string | null;
  }>) {
    if (!occupiesSlot(row.status)) {
      const { error } = await db
        .from("appointments")
        .update({ barber_id: "felice" })
        .eq("id", row.id);
      if (!error) result.moved += 1;
      continue;
    }

    const durationMin = Math.max(
      5,
      Math.round(
        (new Date(row.ends_at).getTime() - new Date(row.starts_at).getTime()) / 60_000,
      ),
    );
    const conflict = feliceBusy.some((f) =>
      rangesOverlap(row.starts_at, row.ends_at, f.starts_at, f.ends_at),
    );

    if (!conflict) {
      const { error } = await db
        .from("appointments")
        .update({ barber_id: "felice" })
        .eq("id", row.id)
        .eq("barber_id", "davide");
      if (!error) {
        result.moved += 1;
        feliceBusy.push({
          id: row.id,
          starts_at: row.starts_at,
          ends_at: row.ends_at,
          status: row.status,
        });
      } else {
        result.remainingDavide += 1;
      }
      continue;
    }

    const day = formatWallDate(new Date(row.starts_at));
    const originalLabel = `${day} ${formatWallTime(new Date(row.starts_at))}`;
    const hold = findHoldingSlot(day, durationMin, feliceBusy);
    const notes = [
      row.notes?.trim(),
      CONFLICT_NOTE,
      `[Orario richiesto: ${originalLabel}]`,
    ]
      .filter(Boolean)
      .join("\n");

    if (hold) {
      const { error } = await db
        .from("appointments")
        .update({
          barber_id: "felice",
          status: "pending",
          starts_at: hold.starts_at,
          ends_at: hold.ends_at,
          notes,
        })
        .eq("id", row.id);
      if (!error) {
        result.conflictsPending += 1;
        feliceBusy.push({
          id: row.id,
          starts_at: hold.starts_at,
          ends_at: hold.ends_at,
          status: "pending",
        });
      } else {
        const { error: e2 } = await db
          .from("appointments")
          .update({ status: "pending", notes })
          .eq("id", row.id);
        if (!e2) result.conflictsPending += 1;
        else result.remainingDavide += 1;
      }
    } else {
      const { error } = await db
        .from("appointments")
        .update({ status: "pending", notes })
        .eq("id", row.id);
      if (!error) result.conflictsPending += 1;
      else result.remainingDavide += 1;
    }
  }

  await migrateSubsAndBlocks(db, result);
  await deactivateDavide(db, result);

  const { count } = await db
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("barber_id", "davide");
  result.remainingDavide = Math.max(result.remainingDavide, count || 0);
  if ((count || 0) === 0) maintenanceStarted = true;
  return result;
}

async function migrateSubsAndBlocks(
  db: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  result: SoloFeliceMigrateResult,
) {
  const { data: subs } = await db
    .from("booking_subscriptions")
    .update({ barber_id: "felice" })
    .eq("barber_id", "davide")
    .select("id");
  if (subs?.length) result.subscriptions += subs.length;

  const { data: blocks } = await db
    .from("calendar_blocks")
    .update({ barber_id: "felice" })
    .eq("barber_id", "davide")
    .select("id");
  if (blocks?.length) result.blocks += blocks.length;
}

async function deactivateDavide(
  db: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  result: SoloFeliceMigrateResult,
) {
  const { error } = await db
    .from("barbers")
    .update({ active: false, title: "Archiviato" })
    .eq("id", "davide");
  if (!error) result.davideDeactivated = true;
}

export function resetSoloFeliceMigrationForTests() {
  maintenanceStarted = false;
}
