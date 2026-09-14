# WHITE_LABEL_TEMPLATE — kit riusabile (.it / rivendita / Cloudflare)

**Base:** Felice Polese Barber Shop — Next.js 15 + Supabase + gestionale.  
**Scopo:** clonare una struttura già funzionante cambiando solo i dati brand.  
**Audit:** `docs/FULL_SITE_AUDIT.md` (non è certificazione legale).

Snapshot export: `BARBERSHOP_WHITELABEL_TEMPLATE_*` via `scripts/export-offline-backup.mjs`.

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

---

## 2. Cosa cambiare per un nuovo cliente

1. **`lib/site-config.ts`** — brand, legale, NAP, WA, email, social, CF, P.IVA, orari, geo, SEO, hero.  
2. **Env** (da `.env.example`):
   - `NEXT_PUBLIC_SITE_URL=https://www.cliente.it`
   - Supabase URL + service role + anon
   - `ADMIN_USER` / `ADMIN_PASSWORD` **forti** (niente default in prod)
   - `ADMIN_SESSION_SECRET` consigliato
3. **`public/`** — logo, OG, video, favicon.  
4. **`lib/catalog.ts`** — servizi/prezzi.  
5. **`app/privacy-policy`**, `app/cookie-policy`, `app/terms`.  
6. **Supabase nuovo** + migrazioni additive in `supabase/migrations/`.

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

Vedi anche `docs/API_SECURITY_MATRIX.md`.

---

## 5. Legal

`docs/LEGAL_TODO.md` — DPO, RoPA, DPIA, DPA, fonts, retention.  
UX GDPR ≠ conformità certificata.
