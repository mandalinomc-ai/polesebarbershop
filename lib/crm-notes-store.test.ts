import { describe, expect, it, vi, beforeEach } from "vitest";

const storageData = new Map<string, string>();
let tableMissing = true;

function makeDb() {
  return {
    from(table: string) {
      if (table !== "customer_notes") throw new Error("unexpected table");
      return {
        select() {
          return tableMissing
            ? { data: null, error: { code: "PGRST205", message: "Could not find the table" } }
            : {
                data: [{ client_key: "p:39123456789", notes: "sql note" }],
                error: null,
              };
        },
        upsert(payload: { client_key: string; notes: string }) {
          const result = tableMissing
            ? { data: null, error: { code: "PGRST205", message: "Could not find the table" } }
            : { data: payload, error: null };
          return {
            select() {
              return {
                single: async () => result,
              };
            },
          };
        },
      };
    },
    storage: {
      async listBuckets() {
        return { data: [{ name: "crm-data" }], error: null };
      },
      async createBucket() {
        return { data: { name: "crm-data" }, error: null };
      },
      from() {
        return {
          async download(path: string) {
            const raw = storageData.get(path);
            if (!raw) return { data: null, error: { message: "not found" } };
            return { data: { text: async () => raw }, error: null };
          },
          async upload(path: string, body: string) {
            storageData.set(path, body);
            return { error: null };
          },
        };
      },
    },
  };
}

describe("crm-notes-store", () => {
  beforeEach(() => {
    storageData.clear();
    tableMissing = true;
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("loads and saves via storage when customer_notes table is missing", async () => {
    const { loadCrmNotesMap, saveCrmNote } = await import("./crm-notes-store");
    const db = makeDb() as never;

    const empty = await loadCrmNotesMap(db);
    expect(empty.source).toBe("storage");
    expect(empty.map).toEqual({});

    const saved = await saveCrmNote(db, "p:3999888777", "Cliente VIP");
    expect(saved.ok).toBe(true);
    if (saved.ok) expect(saved.source).toBe("storage");

    const reloaded = await loadCrmNotesMap(db);
    expect(reloaded.map["p:3999888777"]).toBe("Cliente VIP");
  });

  it("prefers SQL table when available", async () => {
    tableMissing = false;
    const { loadCrmNotesMap, saveCrmNote } = await import("./crm-notes-store");
    const db = makeDb() as never;

    const loaded = await loadCrmNotesMap(db);
    expect(loaded.source).toBe("table");
    expect(loaded.map["p:39123456789"]).toBe("sql note");

    const saved = await saveCrmNote(db, "p:39123456789", "updated");
    expect(saved.ok).toBe(true);
    if (saved.ok) expect(saved.source).toBe("table");
  });
});
