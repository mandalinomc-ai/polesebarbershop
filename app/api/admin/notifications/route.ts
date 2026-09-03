import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { notificationFromAppointment } from "@/lib/crm-notifications";
import { getSupabaseAdmin, isSupabaseConfigured, type AppointmentRow } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ notifications: [], warning: "Database non collegato." });
  }
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ notifications: [], warning: "Database non collegato." });

  const { data, error } = await db
    .from("appointments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    return NextResponse.json({ notifications: [], warning: "Impossibile caricare le notifiche." });
  }

  const notifications = ((data || []) as AppointmentRow[]).map(notificationFromAppointment);
  return NextResponse.json({ notifications });
}
