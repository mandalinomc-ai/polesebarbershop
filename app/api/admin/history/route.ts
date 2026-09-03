import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { formatWallDate, formatWallTime } from "@/lib/availability";
import { namesFromSnapshot } from "@/lib/appointments";
import { getBarber } from "@/lib/catalog";
import { getSupabaseAdmin, isSupabaseConfigured, type AppointmentRow } from "@/lib/supabase";
import { fetchAllPages } from "@/lib/supabase-query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS_IT: Record<string, string> = {
  pending: "In attesa",
  confirmed: "Confermato",
  completed: "Completato",
  cancelled: "ANNULLATA",
  walk_in: "Walk-in",
};

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ appointments: [], warning: "Database non collegato." });
  }
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ appointments: [], warning: "Database non collegato." });

  const { data, error } = await fetchAllPages<AppointmentRow>(async (from, to) =>
    db.from("appointments").select("*").order("starts_at", { ascending: false }).range(from, to),
  );
  if (error) {
    return NextResponse.json({ appointments: [], warning: "Impossibile caricare lo storico." });
  }

  const appointments = (data || []).map((row) => {
    const start = new Date(row.starts_at);
    return {
      id: row.id,
      status: row.status,
      statusLabel: STATUS_IT[row.status] || row.status,
      barberId: row.barber_id,
      barberName: getBarber(row.barber_id)?.name || row.barber_id,
      serviceNames: namesFromSnapshot(row.services_snapshot),
      customerName: `${row.customer_first_name} ${row.customer_last_name}`.trim(),
      phone: row.customer_phone,
      email: row.customer_email,
      startsAt: row.starts_at,
      timeLabel: formatWallTime(start),
      dateLabel: formatWallDate(start),
      durationMin: row.duration_min,
      priceCents: row.price_cents,
      isWalkIn: row.is_walk_in,
      notes: row.notes,
    };
  });

  return NextResponse.json({ appointments });
}
