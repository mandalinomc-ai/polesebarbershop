import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { clientKeyFromContact, normalizePersonName } from "@/lib/crm";
import { getSupabaseAdmin, isSupabaseConfigured, SUPABASE_MISSING_IT } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const profileSchema = z.object({
  clientKey: z.string().min(1).optional(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(40).optional().default(""),
  email: z.string().trim().max(120).optional().default(""),
  /** When completing an incomplete walk-in sheet, also fill empty contact on matching appointments. */
  updateAppointments: z.boolean().optional().default(true),
});

function digits(phone: string) {
  return phone.replace(/\D/g, "");
}

function tableMissing(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === "PGRST205" || /Could not find the table|does not exist|schema cache/i.test(error.message || "");
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: SUPABASE_MISSING_IT }, { status: 503 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nome, cognome e contatti non validi." }, { status: 400 });
  }

  const firstName = parsed.data.firstName.trim();
  const lastName = parsed.data.lastName.trim();
  const phone = parsed.data.phone.trim();
  const email = parsed.data.email.trim().toLowerCase();
  if (digits(phone).length < 8 && !email.includes("@")) {
    return NextResponse.json(
      { error: "Inserisci almeno un telefono valido o un’email." },
      { status: 400 },
    );
  }

  const clientKey =
    parsed.data.clientKey ||
    clientKeyFromContact({ firstName, lastName, phone, email });

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: SUPABASE_MISSING_IT }, { status: 503 });

  const { error: upsertError } = await db.from("customer_profiles").upsert(
    {
      client_key: clientKey,
      first_name: firstName,
      last_name: lastName,
      phone,
      email,
    },
    { onConflict: "client_key" },
  );

  if (upsertError) {
    if (tableMissing(upsertError)) {
      return NextResponse.json(
        {
          error:
            "Tabella clienti mancante: esegui supabase/migrations/011_customer_profiles.sql nel SQL Editor Supabase.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Impossibile salvare il cliente." }, { status: 500 });
  }

  let appointmentsUpdated = 0;
  if (parsed.data.updateAppointments && (digits(phone).length >= 8 || email.includes("@"))) {
    const wantFirst = normalizePersonName(firstName);
    const wantLast = normalizePersonName(lastName);
    const { data: rows } = await db
      .from("appointments")
      .select("id, customer_first_name, customer_last_name, customer_phone, customer_email")
      .order("starts_at", { ascending: false })
      .limit(500);

    const toPatch = (rows || []).filter((row) => {
      const same =
        normalizePersonName(String(row.customer_first_name || "")) === wantFirst &&
        normalizePersonName(String(row.customer_last_name || "")) === wantLast;
      if (!same) return false;
      const rowPhone = String(row.customer_phone || "").replace(/\D/g, "");
      const rowEmail = String(row.customer_email || "").trim();
      return rowPhone.length < 8 && !rowEmail.includes("@");
    });

    for (const row of toPatch) {
      const patch: Record<string, string> = {};
      if (digits(phone).length >= 8) patch.customer_phone = phone;
      if (email.includes("@")) patch.customer_email = email;
      if (!Object.keys(patch).length) continue;
      const { error } = await db.from("appointments").update(patch).eq("id", row.id);
      if (!error) appointmentsUpdated += 1;
    }
  }

  return NextResponse.json({ ok: true, clientKey, appointmentsUpdated });
}
