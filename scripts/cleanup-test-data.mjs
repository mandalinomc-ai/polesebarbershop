#!/usr/bin/env node
/** Delete verified test data only. */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const TEST_EMAIL_PATTERNS = [/^test@/i, /^test-/i, /test-finale-cursor@example\.com$/i];
const TEST_NAMES = [{ first: "Eugenio", last: "Ciullo" }];

function isTestEmail(email) {
  return TEST_EMAIL_PATTERNS.some((re) => re.test(email.trim()));
}

const { data: rows, error } = await sb
  .from("appointments")
  .select("id, customer_first_name, customer_last_name, customer_email, status");

if (error) {
  console.error("Load failed:", error.message);
  process.exit(1);
}

const toDelete = (rows || []).filter((row) => {
  const email = row.customer_email || "";
  const nameMatch = TEST_NAMES.some(
    (n) =>
      row.customer_first_name?.toLowerCase() === n.first.toLowerCase() &&
      row.customer_last_name?.toLowerCase() === n.last.toLowerCase(),
  );
  return nameMatch || isTestEmail(email);
});

console.log(`Found ${toDelete.length} test appointment(s) to delete:`);
for (const row of toDelete) {
  console.log(`  - ${row.id} ${row.customer_first_name} ${row.customer_last_name} <${row.customer_email}> [${row.status}]`);
}

if (!toDelete.length) {
  console.log("Nothing to delete.");
  process.exit(0);
}

const ids = toDelete.map((r) => r.id);
const { error: delErr } = await sb.from("appointments").delete().in("id", ids);
if (delErr) {
  console.error("Delete failed:", delErr.message);
  process.exit(1);
}
console.log("Deleted OK.");

// Clean Eugenio note from storage fallback if present
const { data: noteFile } = await sb.storage.from("crm-data").download("customer-notes.json");
if (noteFile) {
  try {
    const map = JSON.parse(await noteFile.text());
    delete map["p:393483470654"];
    await sb.storage.from("crm-data").upload("customer-notes.json", JSON.stringify(map), {
      upsert: true,
      contentType: "application/json",
    });
    console.log("Cleaned test note from storage.");
  } catch {
    /* ignore */
  }
}
