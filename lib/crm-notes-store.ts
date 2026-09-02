import type { SupabaseClient } from "@supabase/supabase-js";

const STORAGE_BUCKET = "crm-data";
const STORAGE_OBJECT = "customer-notes.json";

type NotesMap = Record<string, string>;

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    /Could not find the table|does not exist/i.test(error.message || "")
  );
}

async function loadNotesFromTable(db: SupabaseClient): Promise<NotesMap | null> {
  const { data, error } = await db.from("customer_notes").select("client_key, notes");
  if (error) {
    if (isMissingTableError(error)) return null;
    throw new Error(error.message);
  }
  const map: NotesMap = {};
  for (const row of data || []) {
    map[row.client_key as string] = (row.notes as string) || "";
  }
  return map;
}

async function saveNoteToTable(
  db: SupabaseClient,
  clientKey: string,
  notes: string,
): Promise<{ ok: true; source: "table" } | { ok: false; missingTable: boolean; error: string }> {
  const { data, error } = await db
    .from("customer_notes")
    .upsert({ client_key: clientKey, notes }, { onConflict: "client_key" })
    .select("*")
    .single();

  if (error) {
    return {
      ok: false,
      missingTable: isMissingTableError(error),
      error: error.message,
    };
  }
  if (!data) {
    return { ok: false, missingTable: false, error: "Impossibile salvare le note." };
  }
  return { ok: true, source: "table" };
}

async function ensureStorageBucket(db: SupabaseClient) {
  const { data: buckets } = await db.storage.listBuckets();
  if (buckets?.some((b) => b.name === STORAGE_BUCKET)) return;
  await db.storage.createBucket(STORAGE_BUCKET, { public: false });
}

async function loadNotesFromStorage(db: SupabaseClient): Promise<NotesMap> {
  await ensureStorageBucket(db);
  const { data, error } = await db.storage.from(STORAGE_BUCKET).download(STORAGE_OBJECT);
  if (error || !data) return {};
  try {
    const parsed = JSON.parse(await data.text()) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const map: NotesMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") map[key] = value;
    }
    return map;
  } catch {
    return {};
  }
}

async function saveNoteToStorage(
  db: SupabaseClient,
  clientKey: string,
  notes: string,
): Promise<{ ok: true; source: "storage" } | { ok: false; error: string }> {
  await ensureStorageBucket(db);
  const map = await loadNotesFromStorage(db);
  map[clientKey] = notes;
  const body = JSON.stringify(map);
  const { error } = await db.storage.from(STORAGE_BUCKET).upload(STORAGE_OBJECT, body, {
    upsert: true,
    contentType: "application/json",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, source: "storage" };
}

/** Load CRM notes — prefers `customer_notes` table, falls back to private storage JSON. */
export async function loadCrmNotesMap(db: SupabaseClient): Promise<{
  map: NotesMap;
  source: "table" | "storage" | "none";
}> {
  try {
    const table = await loadNotesFromTable(db);
    if (table) return { map: table, source: "table" };
  } catch (error) {
    console.warn("[crm-notes] table read failed, using storage fallback", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  try {
    const map = await loadNotesFromStorage(db);
    return { map, source: "storage" };
  } catch (error) {
    console.error("[crm-notes] storage read failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { map: {}, source: "none" };
  }
}

export async function saveCrmNote(
  db: SupabaseClient,
  clientKey: string,
  notes: string,
): Promise<
  | { ok: true; source: "table" | "storage"; notes: string }
  | { ok: false; error: string; needsMigration?: boolean }
> {
  const table = await saveNoteToTable(db, clientKey, notes);
  if (table.ok) return { ok: true, source: "table", notes };

  if (!table.missingTable) {
    console.warn("[crm-notes] table write failed, trying storage fallback", { error: table.error });
  }

  const storage = await saveNoteToStorage(db, clientKey, notes);
  if (storage.ok) {
    if (table.missingTable) {
      console.info("[crm-notes] saved via storage fallback (run migration 005 for SQL table)");
    }
    return { ok: true, source: "storage", notes };
  }

  return {
    ok: false,
    needsMigration: table.missingTable,
    error: table.missingTable
      ? "Note salvate in storage temporaneo non riuscito. Esegui supabase/migrations/005_customer_notes.sql."
      : storage.error || table.error,
  };
}
