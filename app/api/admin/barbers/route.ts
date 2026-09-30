import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import {
  createRuntimeBarber,
  loadRuntimeBarbers,
  setBarberActive,
} from "@/lib/runtime-barbers";
import { flattenZodError } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const createSchema = z.object({
  name: z.string().trim().min(2).max(60),
  title: z.string().trim().max(120).optional(),
});

const patchSchema = z.object({
  id: z.string().trim().min(1).max(80),
  active: z.boolean(),
});

/** Lista team (Felice + dipendenti attivi/inattivi). */
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }
  const barbers = await loadRuntimeBarbers({ includeInactive: true });
  return NextResponse.json({
    barbers: barbers
      .filter((b) => !b.virtual)
      .map((b) => ({
        id: b.id,
        name: b.name,
        title: b.title,
        active: b.active !== false,
      })),
  });
}

/** Aggiungi un dipendente: compare subito in prenotazione, agenda, stats e storico. */
export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
  }
  const result = await createRuntimeBarber(parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({
    ok: true,
    barber: {
      id: result.barber.id,
      name: result.barber.name,
      title: result.barber.title,
      active: true,
    },
  });
}

/** Attiva / disattiva dipendente (nascosto dal front se inactive). */
export async function PATCH(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
  }
  const result = await setBarberActive(parsed.data.id, parsed.data.active);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({
    ok: true,
    barber: {
      id: result.barber.id,
      name: result.barber.name,
      title: result.barber.title,
      active: result.barber.active !== false,
    },
  });
}
