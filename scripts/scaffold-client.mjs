#!/usr/bin/env node
/**
 * Scaffold or activate a white-label client pack.
 *
 * Examples:
 *   node scripts/scaffold-client.mjs --slug mario-fade --name "Mario Fade Studio"
 *   node scripts/scaffold-client.mjs --slug mario-fade --name "Mario Fade" --activate
 *   node scripts/scaffold-client.mjs --slug felice-polese --activate
 */
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const CLIENTS = join(ROOT, "clients");

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function usage(code = 1) {
  console.log(`Usage:
  node scripts/scaffold-client.mjs --slug <kebab-id> [--name "Nome Salone"] [--activate]
  node scripts/scaffold-client.mjs --slug <existing-id> --activate

Flags:
  --slug       Required. Folder under clients/ (lowercase kebab-case)
  --name       Display name (used when creating a new pack)
  --activate   Point clients/active.ts at this slug
  --force      Overwrite an existing pack folder when scaffolding
`);
  process.exit(code);
}

const slug = (arg("--slug") || "").trim().toLowerCase();
const name = (arg("--name") || "").trim();
const activate = hasFlag("--activate");
const force = hasFlag("--force");

if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error("Serve --slug in kebab-case (es. mario-fade-studio).");
  usage(1);
}

const dest = join(CLIENTS, slug);
const templateDir = join(CLIENTS, "_template");
const isExisting = existsSync(join(dest, "profile.ts"));

if (!isExisting) {
  if (!existsSync(templateDir)) {
    console.error("Manca clients/_template/");
    process.exit(1);
  }
  if (existsSync(dest) && !force) {
    console.error(`Esiste già ${dest}. Usa --force o scegli un altro slug.`);
    process.exit(1);
  }
  mkdirSync(dest, { recursive: true });
  cpSync(templateDir, dest, { recursive: true });

  const profilePath = join(dest, "profile.ts");
  let profileSrc = readFileSync(profilePath, "utf8");
  profileSrc = profileSrc.replace(
    /slug: "nuovo-cliente"/,
    `slug: ${JSON.stringify(slug)}`,
  );
  if (name) {
    profileSrc = profileSrc
      .replace(/REPLACE_NOME_SALONE/g, name)
      .replace(/label: "REPLACE_NOME_SALONE"/, `label: ${JSON.stringify(name)}`);
    // After REPLACE replacements, label may already be filled; ensure slug label:
    profileSrc = profileSrc.replace(
      /label: "[^"]*"/,
      `label: ${JSON.stringify(name)}`,
    );
  }
  writeFileSync(profilePath, profileSrc, "utf8");

  const brief = join(dest, "CLIENT_BRIEF.md");
  writeFileSync(
    brief,
    `# Brief cliente — ${name || slug}

Compila e passa questo file a Cursor insieme a foto/video.

## Identità
- Nome salone: ${name || "(da compilare)"}
- Brand (maiuscolo): 
- Tagline: 
- Nome barbiere principale: 
- Dominio: https://

## Contatti / NAP
- Indirizzo completo: 
- Città / CAP / Provincia: 
- Telefono / WhatsApp: 
- Email: 
- Instagram: 
- CF / P.IVA: 
- Coordinate lat/lng (Maps): 

## Orari
- Lun–Dom (apertura/chiusura + pausa pranzo se c’è): 

## Listino
Elenca servizi con prezzo e durata (o “solo consulenza WhatsApp”):
- 

## Media allegati
- [ ] Logo
- [ ] OG cover
- [ ] Foto locale
- [ ] Video reel
- [ ] Foto prodotti (se presenti)

## Note stile
Colori / tono / cose da evitare:

Guida: docs/NUOVO_CLIENTE.md
`,
    "utf8",
  );

  console.log(`OK — creato pack clients/${slug}/`);
  console.log(`    Compila profile.ts + CLIENT_BRIEF.md e carica i media.`);
} else {
  console.log(`Pack già presente: clients/${slug}/`);
}

if (activate) {
  const activePath = join(CLIENTS, "active.ts");
  writeFileSync(
    activePath,
    `/**
 * Active white-label client pack.
 * Switch with: node scripts/scaffold-client.mjs --slug <id> --activate
 */
export { profile as CLIENT } from "./${slug}/profile";
`,
    "utf8",
  );
  console.log(`OK — clients/active.ts → ${slug}`);
}

console.log(`
Prossimi passi:
  1. Modifica clients/${slug}/profile.ts (tutti i REPLACE_* / dati reali)
  2. Aggiorna lib/catalog.ts (servizi/prezzi/orari) e lib/products.ts
  3. Sostituisci file in public/assets/ (vedi clients/${slug}/MEDIA_CHECKLIST.md)
  4. Copia .env.example → .env.local (Supabase nuovo + ADMIN_* + SITE_URL)
  5. npm run build && verifica home / prenota / gestionale
  6. Guida Cursor: docs/NUOVO_CLIENTE.md
`);
