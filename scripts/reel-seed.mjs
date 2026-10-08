#!/usr/bin/env node
/**
 * Applies supabase/seed-video.sql to the DB in DATABASE_URL / DIRECT_URL.
 * Refuses production Supabase project refs unless VIDEO_ALLOW_PRODUCTION=1.
 */
import { config } from "dotenv";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(root, ".env.video") });
config({ path: join(root, ".env.local") });

const sqlPath = join(root, "supabase", "seed-video.sql");
if (!existsSync(sqlPath)) {
  console.error("Missing supabase/seed-video.sql");
  process.exit(1);
}

const dbUrl =
  process.env.VIDEO_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.DIRECT_URL ||
  "";

if (!dbUrl) {
  console.log(
    [
      "reel:seed — no DATABASE_URL / VIDEO_DATABASE_URL set.",
      "Apply manually on LOCAL/STAGING only:",
      "  psql \"$DATABASE_URL\" -f supabase/seed-video.sql",
      "Or: supabase db reset  (after wiring seed in config.toml)",
      "Never run seed-video.sql against production.",
    ].join("\n"),
  );
  process.exit(0);
}

if (
  /dbbncprluqjrofjemfbg|supabase\.co.*prod/i.test(dbUrl) &&
  process.env.VIDEO_ALLOW_PRODUCTION !== "1"
) {
  console.error("REFUSED: seed target looks like production. Abort.");
  process.exit(1);
}

const psql = spawnSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-f", sqlPath], {
  encoding: "utf8",
});
if (psql.status !== 0) {
  console.error(psql.stderr || psql.stdout);
  process.exit(psql.status || 1);
}
console.log("Applied supabase/seed-video.sql");
