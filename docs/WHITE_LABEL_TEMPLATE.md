# WHITE_LABEL_TEMPLATE — kit riusabile (.it / rivendita / Cloudflare)

**Base:** Felice Polese Barber Shop — Next.js 15 + Supabase + gestionale.  
**Scopo:** clonare una struttura già funzionante cambiando solo i dati brand.  
**Guida operativa Cursor:** [`docs/NUOVO_CLIENTE.md`](./NUOVO_CLIENTE.md)  
**Audit:** `docs/FULL_SITE_AUDIT.md` (non è certificazione legale).

Snapshot export: `BARBERSHOP_WHITELABEL_TEMPLATE_*` via `scripts/export-offline-backup.mjs`.

---

## 0. Architettura pack cliente

```
clients/
  active.ts              ← pack in uso (import unico)
  felice-polese/         ← riferimento live
  _template/             ← modello vuoto
  <nuovo-slug>/          ← creato da scaffold-client
lib/client-kit/types.ts  ← schema TypeScript del pack
```

```bash
node scripts/scaffold-client.mjs --slug mio-salone --name "Mio Salone" --activate
```

Brand / NAP / copy hero arrivano da `clients/<slug>/profile.ts` → `lib/site-config.ts`.  
Listino, video e foto restano nei moduli dedicati (vedi tabella sotto) così puoi adattarli per cliente senza toccare il motore di booking.

---

## 1. Cosa è già pronto

| Area | Pronto | Da personalizzare |
|------|--------|-------------------|
| Landing, listino duale, mini-cart dock, video | Sì | Copy, media, colori |
| Prenotazione + `/appuntamento/[token]` | Sì | Servizi / prezzi / orari |
| Gestionale `/gestionale` | Sì | Admin user/password |
| API `/api/admin/*` con `isAdminRequest` | Sì | Secrets env |
| Privacy / cookie / terms + banner | Sì | Titolare, CF/P.IVA |
| robots / sitemap da `NEXT_PUBLIC_SITE_URL` | Sì | Solo URL |
| Pack identity (`clients/*`) | Sì | Nuovo slug + profile |

---

## 2. Cosa cambiare per un nuovo cliente

1. **Pack** — `node scripts/scaffold-client.mjs --slug … --activate` poi `clients/<slug>/profile.ts`.  
2. **Env** (da `.env.example`):
   - `NEXT_PUBLIC_SITE_URL=https://www.cliente.it`
   - Supabase URL + service role + anon (**progetto nuovo**)
   - `ADMIN_USER` / `ADMIN_PASSWORD` **forti** (niente default in prod)
   - `ADMIN_SESSION_SECRET` consigliato
3. **`public/`** — logo, OG, video, favicon (`clients/<slug>/MEDIA_CHECKLIST.md`).  
4. **`lib/catalog.ts`** — servizi/prezzi/orari seed/barbieri.  
5. **`lib/products.ts`**, **`lib/salon-photos.ts`**, **`lib/site-videos.ts`**.  
6. **`app/privacy-policy`**, `app/cookie-policy`, `app/terms` + `public/site.webmanifest`.  
7. **Supabase nuovo** + migrazioni additive in `supabase/migrations/`.

Go-live check: home, `/prenota`, banner, booking+ICS, `/gestionale`, `/robots.txt`, `/sitemap.xml`, HTTPS.

---

## 3. Cloudflare + dominio .it

**Consigliato se già su Vercel:** DNS Cloudflare → Vercel Domains; un set di `NEXT_PUBLIC_SITE_URL` + un redeploy; SSL Full (strict); no cache aggressiva su `/api/*` e `/gestionale`.

**App su Cloudflare:** serve adapter (OpenNext/Workers) oppure **VPS/Docker + Cloudflare Tunnel** (`deploy-standalone.md`). Evita deploy di prova multipli.

```bash
npm run backup:offline
node scripts/export-offline-backup.mjs --out /tmp/barbershop-template.tar.gz --template
```

Niente dump DB nell’archivio — export ufficiale Supabase se serve.

---

## 4. Sicurezza rivendita

- HTML `/gestionale` pubblico; API dati solo con sessione HMAC (`isAdminRequest`).  
- Rate limit in-memory ≠ WAF.  
- Password admin unica per installazione.  
- Non condividere service role / app password tra clienti.  
- Prima di ogni deploy: verifica `clients/active.ts` (non pubblicare il pack sbagliato sul dominio sbagliato).

Vedi anche `docs/API_SECURITY_MATRIX.md`.

---

## 5. Legal

`docs/LEGAL_TODO.md` — DPO, RoPA, DPIA, DPA, fonts, retention.  
UX GDPR ≠ conformità certificata.
