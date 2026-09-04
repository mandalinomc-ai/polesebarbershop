#!/usr/bin/env node
/**
 * Hard-delete every row in public.appointments (test reset).
 * Uses SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from the environment.
 */
import { createClient } from "@supabase/supabase-js";

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "").trim();

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { count, error: countErr } = await db
  .from("appointments")
  .select("id", { count: "exact", head: true });
if (countErr) {
  console.error("Count failed:", countErr.message);
  process.exit(1);
}

const before = count ?? 0;
if (before === 0) {
  console.log(JSON.stringify({ deleted: 0, before: 0 }));
  process.exit(0);
}

const { error: delErr } = await db.from("appointments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
if (delErr) {
  console.error("Delete failed:", delErr.message);
  process.exit(1);
}

const { count: afterCount, error: afterErr } = await db
  .from("appointments")
  .select("id", { count: "exact", head: true });
if (afterErr) {
  console.error("Verify failed:", afterErr.message);
  process.exit(1);
}

const after = afterCount ?? 0;
console.log(JSON.stringify({ deleted: before - after, before, after }));
