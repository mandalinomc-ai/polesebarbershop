#!/usr/bin/env node
/**
 * List Vercel deployments eligible for cleanup (DOES NOT DELETE).
 *
 * Rules:
 * - Never list/remove Current Production deployments
 * - Never touch protected projects: eugeniociullo, antonellafrangiosa,
 *   pellevernici, kombatmania, klarida*
 * - For other projects: preview + old non-production created before 2026-09-01
 *
 * Usage:
 *   VERCEL_TOKEN=… node scripts/list-vercel-cleanup.mjs
 *   VERCEL_TOKEN=… node scripts/list-vercel-cleanup.mjs --json > /tmp/cleanup-candidates.json
 */
import { writeFileSync } from "node:fs";

const TOKEN = (process.env.VERCEL_TOKEN || "").trim();
if (!TOKEN) {
  console.error("Missing VERCEL_TOKEN");
  process.exit(1);
}

const CUTOFF = Date.parse("2026-09-01T00:00:00.000Z");
const PROTECTED = [
  /^eugeniociullo$/i,
  /^antonellafrangiosa$/i,
  /^pellevernici$/i,
  /^kombatmania$/i,
  /klarida/i,
];

function isProtected(name) {
  return PROTECTED.some((re) => re.test(String(name || "")));
}

async function api(path) {
  const res = await fetch(`https://api.vercel.com${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${path}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

async function listAllProjects() {
  const projects = [];
  let until;
  for (;;) {
    const q = new URLSearchParams({ limit: "100" });
    if (until) q.set("until", String(until));
    const json = await api(`/v9/projects?${q}`);
    projects.push(...(json.projects || []));
    const next = json.pagination?.next;
    if (!next) break;
    until = next;
  }
  return projects;
}

async function listDeployments(projectId) {
  const deployments = [];
  let until;
  for (;;) {
    const q = new URLSearchParams({ limit: "100", projectId });
    if (until) q.set("until", String(until));
    const json = await api(`/v6/deployments?${q}`);
    deployments.push(...(json.deployments || []));
    const next = json.pagination?.next;
    if (!next) break;
    until = next;
  }
  return deployments;
}

const asJson = process.argv.includes("--json");
const projects = await listAllProjects();
const candidates = [];

for (const p of projects) {
  const name = p.name || p.id;
  if (isProtected(name)) {
    console.error(`SKIP protected project: ${name}`);
    continue;
  }
  const deps = await listDeployments(p.id);
  const productionIds = new Set(
    deps
      .filter((d) => d.target === "production" && (d.readyState === "READY" || d.state === "READY"))
      .slice(0, 1)
      .map((d) => d.uid || d.id),
  );
  // Also protect aliases that look like production current
  for (const d of deps) {
    const id = d.uid || d.id;
    const created = d.created || d.createdAt || 0;
    const target = d.target || null;
    const state = d.readyState || d.state || "";
    if (productionIds.has(id)) continue;
    if (target === "production") {
      // Keep latest production only; older production can be cleanup candidates if before cutoff
      const isLatestProd = [...productionIds][0] === id;
      if (isLatestProd) continue;
    }
    const isPreview = target !== "production";
    const oldEnough = created < CUTOFF;
    if (!isPreview && !oldEnough) continue;
    if (!oldEnough && isPreview && created >= CUTOFF) {
      // Still allow preview cleanup for very old only — user asked before Sep 1
      continue;
    }
    if (!oldEnough) continue;
    candidates.push({
      project: name,
      projectId: p.id,
      id,
      url: d.url,
      target: target || "preview",
      state,
      created: new Date(created).toISOString(),
      createdMs: created,
    });
  }
}

candidates.sort((a, b) => a.createdMs - b.createdMs);

if (asJson) {
  writeFileSync("/tmp/vercel-cleanup-candidates.json", JSON.stringify(candidates, null, 2));
  console.log(JSON.stringify({ count: candidates.length, file: "/tmp/vercel-cleanup-candidates.json" }, null, 2));
} else {
  console.log(`\nCandidates to DELETE (confirmation required): ${candidates.length}\n`);
  for (const c of candidates) {
    console.log(`- [${c.project}] ${c.id}  ${c.target}  ${c.created}  ${c.url || ""}`);
  }
  console.log(`\nProtected projects skipped. Current production never listed.`);
  console.log(`After your OK, delete with: vercel remove <id> --yes  (or API DELETE /v13/deployments/:id)`);
}
