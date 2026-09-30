import { NextResponse } from "next/server";
import { loadCatalogServices } from "@/lib/runtime-catalog";
import { loadRuntimeBarbers } from "@/lib/runtime-barbers";
import {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABEL,
  formatDuration,
  formatPrice,
  getRealBarbers,
} from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Public catalog — services + barbers (seed + dipendenti DB). */
export async function GET() {
  await loadRuntimeBarbers();
  const services = await loadCatalogServices({ includeInactive: false });
  const barbers = getRealBarbers();
  return NextResponse.json(
    {
      categories: SERVICE_CATEGORIES.map((id) => ({
        id,
        label: SERVICE_CATEGORY_LABEL[id],
      })),
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
      barbers: barbers.map((b) => ({
        id: b.id,
        name: b.name,
        title: b.title,
      })),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    },
  );
}
