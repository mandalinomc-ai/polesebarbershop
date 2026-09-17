import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { occupiesSlot } from "@/lib/appointments";

const CONFLICT_NOTE = "[Da confermare: ex Davide — orario già occupato da Felice]";
let maintenanceStarted = false;

export type SoloFeliceMigrateResult = {
  moved: number;
  conflictsPending: number;
  subscriptions: number;
  blocks: number;
  davideDeactivated: boolean;
  viaRpc: boolean;
};

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const as = new Date(aStart).getTime();
  const ae = new Date(aEnd).getTime();
  const bs = new Date(bStart).getTime();
  const be = new Date(bEnd).getTime();
  if (![as, ae, bs, be].every(Number.isFinite)) return false;
  return as < be && bs < ae;
}

/**
 * Idempotent: move Davide → Felice. Free slots stay confirmed; overlaps become pending.
 * Prefers SQL RPC from migration 018 when available; otherwise client-side fallback.
 */
export async function runSoloFeliceMigration(): Promise<SoloFeliceMigrateResult> {
  const result: SoloFeliceMigrateResult = {
    moved: 0,
    conflictsPending: 0,
    subscriptions: 0,
    blocks: 0,
    davideDeactivated: false,
    viaRpc: false,
  };
  if (maintenanceStarted || !isSupabaseConfigured()) return result;
  maintenanceStarted = true;

  const db = getSupabaseAdmin();
  if (!db) return result;

  const rpc = await db.rpc("migrate_davide_to_felice");
  if (!rpc.error && rpc.data && typeof rpc.data === "object") {
    const data = rpc.data as Partial<SoloFeliceMigrateResult>;
    return {
      moved: Number(data.moved) || 0,
      conflictsPending: Number(data.conflictsPending) || 0,
      subscriptions: Number(data.subscriptions) || 0,
      blocks: Number(data.blocks) || 0,
      davideDeactivated: Boolean(data.davideDeactivated),
      viaRpc: true,
    };
  }

  const { data: davideRows, error: dErr } = await db
    .from("appointments")
    .select("id, barber_id, starts_at, ends_at, status, notes")
    .eq("barber_id", "davide");

  if (dErr || !davideRows?.length) {
    await deactivateDavide(db, result);
    await migrateSubsAndBlocks(db, result);
    return result;
  }

  const { data: feliceRows } = await db
    .from("appointments")
    .select("id, starts_at, ends_at, status")
    .eq("barber_id", "felice")
    .in("status", ["pending", "confirmed", "walk_in", "completed"]);

  const feliceBusy = (feliceRows || []).filter((r) => occupiesSlot(r.status));

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
      }
      continue;
    }

    // Cannot overlap on Felice while exclusion includes pending — keep chair id
    // until migration 018 is applied; mark da confermare for the gestionale list.
    const notes = [row.notes?.trim(), CONFLICT_NOTE].filter(Boolean).join("\n");
    const { error } = await db
      .from("appointments")
      .update({ status: "pending", notes })
      .eq("id", row.id);
    if (!error) result.conflictsPending += 1;
  }

  await migrateSubsAndBlocks(db, result);
  await deactivateDavide(db, result);
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
