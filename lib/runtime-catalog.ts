import {
  SERVICES,
  type Service,
  type ServiceCategory,
  getService,
  isBookableServiceId,
} from "./catalog";
import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase";

export type ServiceDbRow = {
  id: string;
  name: string;
  description: string;
  category: string;
  duration_min: number;
  price_cents: number;
  price_max_cents: number | null;
  is_variable_price: boolean;
  active: boolean;
  sort_order?: number;
};

type OverrideCache = {
  at: number;
  rows: Map<string, ServiceDbRow>;
};

const CACHE_TTL_MS = 15_000;
let cache: OverrideCache | null = null;

/** Clear in-process cache after admin writes. */
export function invalidateRuntimeCatalogCache() {
  cache = null;
}

function mergeService(base: Service, row?: ServiceDbRow | null): Service {
  if (!row) return { ...base, active: base.active !== false };
  return {
    ...base,
    name: row.name || base.name,
    description: row.description ?? base.description,
    category: (row.category as ServiceCategory) || base.category,
    durationMin: row.duration_min > 0 ? row.duration_min : base.durationMin,
    durationKnown: row.duration_min > 0 ? true : base.durationKnown,
    priceEuro: Math.round(row.price_cents) / 100,
    priceMaxEuro:
      row.price_max_cents != null ? Math.round(row.price_max_cents) / 100 : base.priceMaxEuro,
    isVariablePrice: Boolean(row.is_variable_price),
    active: row.active !== false,
  };
}

async function fetchDbRows(): Promise<Map<string, ServiceDbRow>> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.rows;
  const empty = new Map<string, ServiceDbRow>();
  if (!isSupabaseConfigured()) {
    cache = { at: Date.now(), rows: empty };
    return empty;
  }
  const db = getSupabaseAdmin();
  if (!db) {
    cache = { at: Date.now(), rows: empty };
    return empty;
  }
  const { data, error } = await db
    .from("services")
    .select(
      "id, name, description, category, duration_min, price_cents, price_max_cents, is_variable_price, active, sort_order",
    )
    .in(
      "id",
      SERVICES.map((s) => s.id),
    );
  if (error || !data) {
    cache = { at: Date.now(), rows: empty };
    return empty;
  }
  const rows = new Map<string, ServiceDbRow>();
  for (const row of data as ServiceDbRow[]) {
    rows.set(row.id, row);
  }
  cache = { at: Date.now(), rows };
  return rows;
}

/**
 * Full catalog with DB duration/price/active overlays.
 * Falls back to lib/catalog.ts seed when Supabase is unavailable.
 */
export async function loadCatalogServices(opts?: {
  includeInactive?: boolean;
}): Promise<Service[]> {
  const rows = await fetchDbRows();
  const merged = SERVICES.map((base) => mergeService(base, rows.get(base.id)));
  if (opts?.includeInactive) return merged;
  return merged.filter((s) => s.active !== false);
}

export async function getRuntimeService(id: string): Promise<Service | null> {
  const rows = await fetchDbRows();
  const base = getService(id);
  if (!base) return null;
  const merged = mergeService(base, rows.get(id));
  return merged;
}

/**
 * Resolve selected services from the same source booking/slots use.
 * Inactive or unknown ids → null.
 */
export async function resolveRuntimeServices(ids: string[]): Promise<Service[] | null> {
  const unique = [...new Set(ids)];
  if (!unique.length) return null;
  if (unique.some((id) => !isBookableServiceId(id) && !getService(id))) return null;
  const rows = await fetchDbRows();
  const found: Service[] = [];
  for (const id of unique) {
    const base = getService(id);
    if (!base) return null;
    const merged = mergeService(base, rows.get(id));
    if (merged.active === false) return null;
    found.push(merged);
  }
  return found;
}

export async function listAdminServices(): Promise<Service[]> {
  return loadCatalogServices({ includeInactive: true });
}

export type ServiceAdminPatch = {
  durationMin?: number;
  priceEuro?: number;
  priceMaxEuro?: number | null;
  active?: boolean;
  name?: string;
  description?: string;
};

export async function updateAdminService(
  id: string,
  patch: ServiceAdminPatch,
): Promise<{ ok: true; service: Service } | { ok: false; error: string }> {
  const base = getService(id);
  if (!base) return { ok: false, error: "Servizio non trovato." };
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Database non configurato — impossibile salvare." };
  }
  const db = getSupabaseAdmin();
  if (!db) return { ok: false, error: "Database non configurato — impossibile salvare." };

  const update: Record<string, unknown> = {};
  if (patch.durationMin != null) {
    if (!Number.isInteger(patch.durationMin) || patch.durationMin < 5 || patch.durationMin > 480) {
      return { ok: false, error: "Durata non valida (5–480 min)." };
    }
    update.duration_min = patch.durationMin;
  }
  if (patch.priceEuro != null) {
    if (patch.priceEuro < 0 || patch.priceEuro > 500) {
      return { ok: false, error: "Prezzo non valido." };
    }
    update.price_cents = Math.round(patch.priceEuro * 100);
  }
  if (patch.priceMaxEuro !== undefined) {
    if (patch.priceMaxEuro == null) update.price_max_cents = null;
    else {
      if (patch.priceMaxEuro < 0 || patch.priceMaxEuro > 500) {
        return { ok: false, error: "Prezzo massimo non valido." };
      }
      update.price_max_cents = Math.round(patch.priceMaxEuro * 100);
      update.is_variable_price = true;
    }
  }
  if (patch.active != null) update.active = patch.active;
  if (patch.name != null) {
    const name = patch.name.trim();
    if (name.length < 2 || name.length > 80) return { ok: false, error: "Nome non valido." };
    update.name = name;
  }
  if (patch.description != null) {
    update.description = patch.description.trim().slice(0, 300);
  }

  if (!Object.keys(update).length) {
    return { ok: false, error: "Nessuna modifica." };
  }

  const { data, error } = await db
    .from("services")
    .update(update)
    .eq("id", id)
    .select(
      "id, name, description, category, duration_min, price_cents, price_max_cents, is_variable_price, active",
    )
    .maybeSingle();

  if (error) return { ok: false, error: error.message || "Salvataggio fallito." };
  invalidateRuntimeCatalogCache();
  const row = data as ServiceDbRow | null;
  const service = mergeService(base, row);
  return { ok: true, service };
}
