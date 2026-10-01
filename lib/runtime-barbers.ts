import {
  ANYONE_BARBER_ID,
  BARBERS,
  SHOP_HOURS,
  setRuntimeBarbersOverlay,
  type Barber,
} from "./catalog";
import { SITE } from "./site-config";
import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase";

export type BarberDbRow = {
  id: string;
  name: string;
  title: string;
  active: boolean;
  sort_order: number;
};

type Cache = { at: number; barbers: Barber[] };
const CACHE_TTL_MS = 5_000;
let cache: Cache | null = null;

export function invalidateRuntimeBarbersCache() {
  cache = null;
  setRuntimeBarbersOverlay(null);
}

function slugifyName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function rowToBarber(row: BarberDbRow): Barber {
  return {
    id: row.id,
    name: row.name,
    title: row.title || `Barber · ${SITE.name}`,
    virtual: false,
    hours: SHOP_HOURS,
    active: row.active !== false,
  };
}

function seedBarbers(): Barber[] {
  return BARBERS.map((b) => ({ ...b, active: true }));
}

function mergeBarbers(rows: BarberDbRow[]): Barber[] {
  const byId = new Map<string, Barber>();
  for (const b of seedBarbers()) byId.set(b.id, b);

  for (const row of rows) {
    if (row.id === ANYONE_BARBER_ID) continue;
    if (row.id === "felice") {
      const seed = byId.get("felice")!;
      byId.set("felice", {
        ...seed,
        name: row.name || seed.name,
        title: row.title || seed.title,
        active: row.active !== false,
      });
      continue;
    }
    if (row.id === "davide" && row.active === false) {
      byId.delete("davide");
      continue;
    }
    byId.set(row.id, rowToBarber(row));
  }

  const real = [...byId.values()]
    .filter((b) => !b.virtual)
    .sort((a, b) => {
      if (a.id === "felice") return -1;
      if (b.id === "felice") return 1;
      return a.name.localeCompare(b.name, "it");
    });
  const anyone = byId.get(ANYONE_BARBER_ID);
  return anyone ? [...real, anyone] : real;
}

async function fetchDbBarbers(): Promise<BarberDbRow[]> {
  if (!isSupabaseConfigured()) return [];
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data, error } = await db
    .from("barbers")
    .select("id, name, title, active, sort_order")
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data as BarberDbRow[];
}

/** Seed + DB barbers. Sets sync overlay for getBarber/getRealBarbers. */
export async function loadRuntimeBarbers(opts?: {
  includeInactive?: boolean;
}): Promise<Barber[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    setRuntimeBarbersOverlay(cache.barbers);
    return opts?.includeInactive
      ? cache.barbers
      : cache.barbers.filter((b) => b.virtual || b.active !== false);
  }
  const rows = await fetchDbBarbers();
  const merged = mergeBarbers(rows);
  cache = { at: Date.now(), barbers: merged };
  setRuntimeBarbersOverlay(merged);
  if (opts?.includeInactive) return merged;
  return merged.filter((b) => b.virtual || b.active !== false);
}

export async function ensureRuntimeBarbers(): Promise<Barber[]> {
  return loadRuntimeBarbers();
}

export async function createRuntimeBarber(input: {
  name: string;
  title?: string;
}): Promise<{ ok: true; barber: Barber } | { ok: false; error: string }> {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 60) {
    return { ok: false, error: "Inserisci un nome valido (2–60 caratteri)." };
  }
  if (!/^[\p{L}\s.'’-]+$/u.test(name)) {
    return { ok: false, error: "Usa solo lettere per il nome." };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Database non configurato." };
  }
  const db = getSupabaseAdmin();
  if (!db) return { ok: false, error: "Database non configurato." };

  let base = slugifyName(name) || "barber";
  if (base === "anyone" || base === "felice") base = `${base}-staff`;
  let id = base;
  let n = 2;
  for (;;) {
    const { data: existing } = await db.from("barbers").select("id").eq("id", id).maybeSingle();
    if (!existing) break;
    id = `${base}-${n}`;
    n += 1;
    if (n > 50) return { ok: false, error: "Impossibile generare un id univoco." };
  }

  const title = (input.title || `Barber · ${SITE.name}`).trim().slice(0, 120);
  const { data: maxSort } = await db
    .from("barbers")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = Number((maxSort as { sort_order?: number } | null)?.sort_order || 0) + 10;

  const { data, error } = await db
    .from("barbers")
    .insert({
      id,
      name,
      title,
      active: true,
      sort_order: sortOrder,
    })
    .select("id, name, title, active, sort_order")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message || "Salvataggio fallito." };
  }

  invalidateRuntimeBarbersCache();
  const barber = rowToBarber(data as BarberDbRow);
  await loadRuntimeBarbers();
  return { ok: true, barber };
}

export async function setBarberActive(
  id: string,
  active: boolean,
): Promise<{ ok: true; barber: Barber } | { ok: false; error: string }> {
  if (id === "felice" && !active) {
    return { ok: false, error: "Felice non può essere disattivato." };
  }
  if (id === ANYONE_BARBER_ID) {
    return { ok: false, error: "Voce virtuale non modificabile." };
  }
  if (!isSupabaseConfigured()) return { ok: false, error: "Database non configurato." };
  const db = getSupabaseAdmin();
  if (!db) return { ok: false, error: "Database non configurato." };

  const { data, error } = await db
    .from("barbers")
    .update({ active })
    .eq("id", id)
    .select("id, name, title, active, sort_order")
    .maybeSingle();
  if (error || !data) return { ok: false, error: error?.message || "Aggiornamento fallito." };
  invalidateRuntimeBarbersCache();
  await loadRuntimeBarbers({ includeInactive: true });
  return { ok: true, barber: rowToBarber(data as BarberDbRow) };
}
