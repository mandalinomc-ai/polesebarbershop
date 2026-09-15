import { SERVICES } from "@/lib/catalog";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

const LEGACY_BUFFER_MIN = 5;
let maintenanceStarted = false;

function seedDuration(id: string): number | null {
  const s = SERVICES.find((x) => x.id === id);
  return s?.durationMin ?? null;
}

/**
 * One-shot per warm isolate:
 * 1) Align taglio-* service rows to catalog (30 min)
 * 2) Strip legacy +5 min chair buffer from active appointments
 * 3) Normalize taglio-only bookings to 30 min each (no buffer)
 */
export async function runNoBufferMaintenance(): Promise<{
  servicesUpdated: number;
  appointmentsStripped: number;
  tagliNormalized: number;
}> {
  const result = { servicesUpdated: 0, appointmentsStripped: 0, tagliNormalized: 0 };
  if (maintenanceStarted || !isSupabaseConfigured()) return result;
  maintenanceStarted = true;

  const db = getSupabaseAdmin();
  if (!db) return result;

  const tagli = SERVICES.filter((s) => s.id.startsWith("taglio-"));
  for (const s of tagli) {
    const { data, error } = await db
      .from("services")
      .update({ duration_min: s.durationMin })
      .eq("id", s.id)
      .neq("duration_min", s.durationMin)
      .select("id");
    if (!error && data?.length) result.servicesUpdated += data.length;
  }

  const { data: rows, error: listErr } = await db
    .from("appointments")
    .select("id, starts_at, ends_at, duration_min, service_ids, status")
    .in("status", ["pending", "confirmed", "walk_in"])
    .gte("ends_at", new Date().toISOString());

  if (listErr || !rows?.length) {
    return result;
  }

  for (const row of rows as Array<{
    id: string;
    starts_at: string;
    ends_at: string;
    duration_min: number;
    service_ids: string[] | null;
  }>) {
    const startMs = new Date(row.starts_at).getTime();
    const endMs = new Date(row.ends_at).getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) continue;

    const ids = Array.isArray(row.service_ids) ? row.service_ids : [];
    const tagliOnly = ids.length > 0 && ids.every((id) => id.startsWith("taglio-"));

    if (tagliOnly) {
      const targetMin = ids.reduce((sum, id) => sum + (seedDuration(id) ?? 30), 0);
      const targetEnd = new Date(startMs + targetMin * 60_000).toISOString();
      if (row.duration_min !== targetMin || row.ends_at !== targetEnd) {
        const { error } = await db
          .from("appointments")
          .update({ duration_min: targetMin, ends_at: targetEnd })
          .eq("id", row.id);
        if (!error) result.tagliNormalized += 1;
      }
      continue;
    }

    const occupiedMin = Math.round((endMs - startMs) / 60_000);
    if (occupiedMin === row.duration_min + LEGACY_BUFFER_MIN) {
      const newEnd = new Date(startMs + row.duration_min * 60_000).toISOString();
      const { error } = await db.from("appointments").update({ ends_at: newEnd }).eq("id", row.id);
      if (!error) result.appointmentsStripped += 1;
    }
  }

  return result;
}

/** Test helper — allow re-run in unit tests. */
export function resetNoBufferMaintenanceForTests() {
  maintenanceStarted = false;
}
