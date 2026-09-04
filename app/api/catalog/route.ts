import { NextResponse } from "next/server";
import { loadCatalogServices } from "@/lib/runtime-catalog";
import {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABEL,
  formatDuration,
  formatPrice,
} from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public catalog — same source booking/slots use (catalog seed + DB overlays). */
export async function GET() {
  const services = await loadCatalogServices({ includeInactive: false });
  return NextResponse.json({
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
  });
}
