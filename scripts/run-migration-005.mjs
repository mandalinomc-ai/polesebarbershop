#!/usr/bin/env node
/**
 * Run supabase/migrations/005_customer_notes.sql when SUPABASE_DB_PASSWORD is set.
 * Pooler (IPv4): aws-0-eu-west-2.pooler.supabase.com — project ref dbbncprluqjrofjemfbg
 *
 * Usage:
 *   SUPABASE_DB_PASSWORD='your-db-password' node scripts/run-migration-005.mjs
 */
import fs from "node:fs";
import pg from "pg";

const password = process.env.SUPABASE_DB_PASSWORD?.trim();
if (!password) {
  console.error("Missing SUPABASE_DB_PASSWORD.");
  console.error("Get it from Supabase Dashboard → Project Settings → Database → Database password.");
  console.error("Then run: SUPABASE_DB_PASSWORD='…' node scripts/run-migration-005.mjs");
  process.exit(1);
}

const ref = "dbbncprluqjrofjemfbg";
const sql = fs.readFileSync("supabase/migrations/005_customer_notes.sql", "utf8");
const client = new pg.Client({
  host: "aws-0-eu-west-2.pooler.supabase.com",
  port: 5432,
  user: `postgres.${ref}`,
  password,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

try {
  await client.connect();
  await client.query(sql);
  const check = await client.query(
    "select to_regclass('public.customer_notes') as tbl, count(*) as rows from public.customer_notes",
  );
  console.log("Migration OK:", check.rows[0]);
} catch (e) {
  console.error("Migration failed:", e.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
