import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { normalizePersonName } from "@/lib/crm";
import { getSupabaseAdmin, isSupabaseConfigured, SUPABASE_MISSING_IT } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(40).optional().default(""),
  email: z.string().trim().max(120).optional().default(""),
});

export async function PATCH(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: SUPABASE_MISSING_IT }, { status: 503 });
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Dati non validi." }, { status: 400 });

  const phone = parsed.data.phone.trim();
  const email = parsed.data.email.trim().toLowerCase();
  if (phone.replace(/\D/g, "").length < 8 && !email.includes("@")) {
    return NextResponse.json({ error: "Inserisci almeno telefono o email." }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: SUPABASE_MISSING_IT }, { status: 503 });

  const wantFirst = normalizePersonName(parsed.data.firstName);
  const wantLast = normalizePersonName(parsed.data.lastName);
  const { data: rows } = await db
    .from("appointments")
    .select("id, customer_first_name, customer_last_name, customer_phone, customer_email")
    .order("starts_at", { ascending: false })
    .limit(600);

  let updated = 0;
  for (const row of rows || []) {
    const same =
      normalizePersonName(String(row.customer_first_name || "")) === wantFirst &&
      normalizePersonName(String(row.customer_last_name || "")) === wantLast;
    if (!same) continue;
    const rowPhone = String(row.customer_phone || "").replace(/\D/g, "");
    const rowEmail = String(row.customer_email || "").trim();
    if (rowPhone.length >= 8 || rowEmail.includes("@")) continue;
    const patch: Record<string, unknown> = { is_incomplete: false };
    if (phone.replace(/\D/g, "").length >= 8) patch.customer_phone = phone;
    if (email.includes("@")) patch.customer_email = email;
    const { error } = await db.from("appointments").update(patch).eq("id", row.id);
    if (!error) updated += 1;
    else {
      // Column may be missing pre-migration — still update contacts.
      const soft: Record<string, string> = {};
      if (typeof patch.customer_phone === "string") soft.customer_phone = patch.customer_phone;
      if (typeof patch.customer_email === "string") soft.customer_email = patch.customer_email;
      if (Object.keys(soft).length) {
        const { error: e2 } = await db.from("appointments").update(soft).eq("id", row.id);
        if (!e2) updated += 1;
      }
    }
  }

  return NextResponse.json({ ok: true, updated });
}
