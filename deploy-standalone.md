# FELICE_POLESE_BARBERSHOP_LIVE_2026_09_10 — deploy standalone

Progetto ufficiale di produzione (aggiornato al **10 settembre 2026**).  
Non collegare questo codice a repository o deploy Vercel archiviati (`polesebarbershop`, `pigi-events`, ecc.).

Obiettivo: far girare sito + gestionale su **qualsiasi VPS/server Linux** (Aruba, Netsons, Hetzner, Cloudflare Tunnel, ecc.) con Node.js oppure Docker, senza toccare i dati Supabase già esistenti.

---

## Prerequisiti

- Node.js **≥ 20** (LTS) oppure Docker
- Progetto Supabase già attivo (solo lettura/scrittura app — **niente migrazioni distruttive**)
- File `.env.local` (o variabili d’ambiente del server) compilato da `.env.example`

Variabili minime:

| Variabile | Uso |
|-----------|-----|
| `NEXT_PUBLIC_SITE_URL` | Dominio pubblico (es. `https://www.felicepolese.it`) |
| `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` | URL progetto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chiave server (mai esporre al browser) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `ADMIN_USER` / `ADMIN_PASSWORD` | Accesso `/gestionale` |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | Email prenotazioni + `.ics` |

---

## Opzione A — Node.js su VPS

```bash
# 1) Copia il backup sorgente sul server (vedi scripts/export-offline-backup.mjs)
cd /var/www/felice-polese-live
cp .env.example .env.local   # poi modifica i valori

# 2) Dipendenze + build standalone
npm ci
npm run build

# 3) Avvio (porta 3000)
node .next/standalone/server.js
# oppure, dalla root dopo aver copiato static/public come da Dockerfile:
# HOSTNAME=0.0.0.0 PORT=3000 node .next/standalone/server.js
```

Consiglio produzione: **systemd** o **pm2**:

```bash
pm2 start .next/standalone/server.js --name felice-polese-live
pm2 save
```

Metti un reverse proxy (Nginx / Caddy) su `443` → `127.0.0.1:3000` con il dominio `.it`.

**Nota standalone:** dopo `npm run build`, la cartella `.next/standalone` contiene il server.  
Copia anche `.next/static` → `.next/standalone/.next/static` e `public` → `.next/standalone/public` (il `Dockerfile` lo fa già).

---

## Opzione B — Docker

```bash
# Build
docker build -t felice-polese-live \
  --build-arg NEXT_PUBLIC_SITE_URL=https://www.felicepolese.it \
  .

# Run (env da file locale — non committare segreti)
docker run --rm -p 3000:3000 --env-file .env.local \
  -e NEXT_PUBLIC_SITE_URL=https://www.felicepolese.it \
  felice-polese-live
```

Dietro Cloudflare Tunnel / Nginx punta il hostname al container sulla porta `3000`.

---

## Opzione C — Dominio .it su Cloudflare (DNS) + app su Vercel

1. In Cloudflare DNS: CNAME/ALIAS del dominio verso Vercel (come da istruzioni Vercel Domains).  
2. In Vercel: aggiungi il dominio custom al progetto **Felice** (non a progetti archiviati).  
3. Imposta `NEXT_PUBLIC_SITE_URL=https://www.tuodominio.it` e **un solo** redeploy.  
4. SSL Full (strict); bypass cache su `/api/*` e `/gestionale`.  
5. robots/sitemap seguono automaticamente `NEXT_PUBLIC_SITE_URL`.

Per rivendere / clonare il prodotto: `docs/WHITE_LABEL_TEMPLATE.md`.

---

## Backup codice offline / template

Dal repo ufficiale:

```bash
npm run backup:offline
# oppure, archivio “template” con stamp:
node scripts/export-offline-backup.mjs --out /tmp/barbershop-template.tar.gz --template
```

Genera un archivio `.tar.gz` senza `node_modules`, `.next`, cache e secret.  
**Non** include dump database: per i dati usa l’export ufficiale di Supabase (dashboard), senza DELETE/UPDATE distruttivi.

---

## Checklist go-live dominio .it

1. Imposta `NEXT_PUBLIC_SITE_URL=https://www.felicepolese.it` (senza slash finale)
2. Rebuild / restart (un deploy)
3. Verifica: home, `/prenota`, `/gestionale`, email `.ics`, `/robots.txt`, `/sitemap.xml`
4. Imposta `ADMIN_USER` / `ADMIN_PASSWORD` forti in ambiente (nessun fallback password in codice)
5. Non ripuntare Git a progetti Vercel vecchi o archiviati

Identificativo: **FELICE_POLESE_BARBERSHOP_LIVE_2026_09_10**  
White-label: **docs/WHITE_LABEL_TEMPLATE.md**
