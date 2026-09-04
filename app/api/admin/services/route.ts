import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { formatDuration, formatPrice } from "@/lib/catalog";
import {
  listAdminServices,
  updateAdminService,
} from "@/lib/runtime-catalog";
import { flattenZodError } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  id: z.string().min(1),
  durationMin: z.number().int().min(5).max(480).optional(),
  priceEuro: z.number().min(0).max(500).optional(),
  priceMaxEuro: z.number().min(0).max(500).nullable().optional(),
  active: z.boolean().optional(),
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(300).optional(),
});

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }
  const services = await listAdminServices();
  return NextResponse.json({
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      priceEuro: s.priceEuro,
      priceMaxEuro: s.priceMaxEuro,
      isVariablePrice: s.isVariablePrice,
      durationMin: s.durationMin,
      durationKnown: s.durationKnown,
      active: s.active !== false,
      description: s.description,
      priceLabel: formatPrice(s),
      durationLabel: formatDuration(s),
    })),
  });
}

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
  const { id, ...patch } = parsed.data;
  const result = await updateAdminService(id, patch);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const s = result.service;
  return NextResponse.json({
    ok: true,
    service: {
      id: s.id,
      name: s.name,
      category: s.category,
      priceEuro: s.priceEuro,
      priceMaxEuro: s.priceMaxEuro,
      isVariablePrice: s.isVariablePrice,
      durationMin: s.durationMin,
      durationKnown: s.durationKnown,
      active: s.active !== false,
      description: s.description,
      priceLabel: formatPrice(s),
      durationLabel: formatDuration(s),
    },
  });
}
