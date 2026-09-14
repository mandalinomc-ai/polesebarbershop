#!/usr/bin/env node
/**
 * Export clean source archive = reusable white-label / offline / VPS template.
 * Excludes node_modules, .next, caches, secrets, Vercel local state.
 * Does NOT dump Supabase.
 *
 * Usage:
 *   node scripts/export-offline-backup.mjs
 *   node scripts/export-offline-backup.mjs --out /tmp/barbershop-template.tar.gz
 *   node scripts/export-offline-backup.mjs --template   # stamp + WHITE_LABEL note in JSON
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, existsSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PROJECT_ID = "BARBERSHOP_WHITELABEL_TEMPLATE_2026_09_14";
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const asTemplate = process.argv.includes("--template");

const outArgIdx = Math.max(
  process.argv.indexOf("--out"),
  process.argv.indexOf("--output"),
);
const outPath =
  outArgIdx >= 0 && process.argv[outArgIdx + 1]
    ? resolve(process.argv[outArgIdx + 1])
    : join(
        ROOT,
        "backups",
        `${asTemplate ? "TEMPLATE_" : ""}${PROJECT_ID}_${stamp}.tar.gz`,
      );

mkdirSync(dirname(outPath), { recursive: true });

const stampFile = join(ROOT, "TEMPLATE_EXPORT_STAMP.txt");
writeFileSync(
  stampFile,
  [
    PROJECT_ID,
    `exported_at=${new Date().toISOString()}`,
    "guide=docs/WHITE_LABEL_TEMPLATE.md",
    "audit=docs/FULL_SITE_AUDIT.md",
    "change=lib/site-config.ts + .env from .env.example",
    "",
  ].join("\n"),
  "utf8",
);

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
try {
  unlinkSync(stampFile);
} catch {
  /* ignore */
}

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
      template: asTemplate || true,
      file: outPath,
      guide: "docs/WHITE_LABEL_TEMPLATE.md",
      note: "Sorgente pulita white-label. Personalizza site-config + env. DB: export Supabase dashboard.",
    },
    null,
    2,
  ),
);
