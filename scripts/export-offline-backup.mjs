#!/usr/bin/env node
/**
 * FELICE_POLESE_BARBERSHOP_LIVE_2026_09_10
 * Export a clean source archive for offline backup / VPS migration.
 * Excludes node_modules, .next, caches, secrets, and Vercel local state.
 * Does NOT touch Supabase data (no DB dump / no UPDATE / DELETE).
 *
 * Usage:
 *   node scripts/export-offline-backup.mjs
 *   node scripts/export-offline-backup.mjs --out /tmp/felice-backup.tar.gz
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PROJECT_ID = "FELICE_POLESE_BARBERSHOP_LIVE_2026_09_10";
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");

const outArgIdx = process.argv.indexOf("--out");
const outPath =
  outArgIdx >= 0 && process.argv[outArgIdx + 1]
    ? resolve(process.argv[outArgIdx + 1])
    : join(ROOT, "backups", `${PROJECT_ID}_${stamp}.tar.gz`);

mkdirSync(dirname(outPath), { recursive: true });

const exclude = [
  "node_modules",
  ".next",
  "out",
  "coverage",
  ".git",
  ".vercel",
  ".netlify",
  ".cursor",
  ".env",
  ".env.local",
  ".env.*.local",
  "*.log",
  "tsconfig.tsbuildinfo",
  "backups",
  "npm-debug.log*",
  ".DS_Store",
];

const tarArgs = [
  "-czf",
  outPath,
  "-C",
  ROOT,
  ...exclude.flatMap((pattern) => ["--exclude", pattern]),
  ".",
];

const result = spawnSync("tar", tarArgs, { stdio: "inherit" });
if (result.status !== 0) {
  console.error("Backup fallito. Serve il comando `tar` sul sistema.");
  process.exit(result.status || 1);
}

if (!existsSync(outPath)) {
  console.error("Archivio non creato:", outPath);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      project: PROJECT_ID,
      file: outPath,
      note: "Sorgente pulita. I dati Supabase restano sul cloud — usa l’export ufficiale della dashboard se serve un dump.",
    },
    null,
    2,
  ),
);
