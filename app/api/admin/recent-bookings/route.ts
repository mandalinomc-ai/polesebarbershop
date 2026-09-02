import { NextResponse } from "next/server";
import { formatWallDate, formatWallTime } from "@/lib/availability";
import { isAdminRequest } from "@/lib/admin-auth";
import { namesFromSnapshot } from "@/lib/appointments";
import { getBarber } from "@/lib/catalog";
import { getSupabaseAdmin, isSupabaseConfigured, type AppointmentRow } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(row: AppointmentRow) {
  const start = new Date(row.starts_at);
  return {
    id: row.id,
    firstName: row.customer_first_name,
    lastName: row.customer_last_name,
    phone: row.customer_phone,
    email: row.customer_email,
    startsAt: row.starts_at,
    timeLabel: formatWallTime(start),
    dateLabel: formatWallDate(start),
    serviceNames: namesFromSnapshot(row.services_snapshot),
    barberName: getBarber(row.barber_id)?.name || row.barber_id,
    createdAt: row.created_at,
    status: row.status,
  };
}

export async function GET(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sinceRaw = searchParams.get("since");
  const since =
    sinceRaw && !Number.isNaN(Date.parse(sinceRaw))
      ? new Date(sinceRaw).toISOString()
      : new Date(Date.now() - 60 * 60_000).toISOString();

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ bookings: [], since, warning: "Database non collegato." });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ bookings: [], since, warning: "Database non collegato." });
  }

  const { data, error } = await db
    .from("appointments")
    .select("*")
    .eq("source", "online")
    .gt("created_at", since)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    const schemaMissing =
      error.code === "PGRST205" ||
      /schema cache|Could not find the table|does not exist/i.test(error.message || "");
    return NextResponse.json({
      bookings: [],
      since,
      warning: schemaMissing
        ? "Database collegato ma manca lo schema SQL."
        : "Impossibile caricare le prenotazioni recenti.",
    });
  }

  return NextResponse.json({
    since,
    bookings: ((data || []) as AppointmentRow[]).map(serialize),
  });
}
