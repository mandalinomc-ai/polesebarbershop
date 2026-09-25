# FULL SITE AUDIT — Felice Polese Barber Shop

**Repo:** polesebarbershop / Felice Polese  
**Data:** 2026-09-14 (post fix SEO dinamico + template white-label)  
**Claim:** review fattuale sul codice — **non** pentest, **non** “100% GDPR”.  
**Legal gap list:** `docs/LEGAL_TODO.md`

**Live (docs):** `https://felicepolesebarbershop.it`  
**Config:** `lib/site-config.ts` → `SITE.siteUrl` / `NEXT_PUBLIC_SITE_URL`  
**White-label:** `docs/WHITE_LABEL_TEMPLATE.md` · export `npm run backup:offline`

> **Punto critico (come da tua richiesta):** la UI di login **non** è la sicurezza. Qui le API `/api/admin/*` (tranne login/logout) passano da middleware (presenza cookie) **e** da `isAdminRequest()` HMAC lato server. `ADMIN_PASSWORD` non ha fallback in codice: senza env il login è disabilitato (503). In produzione va impostata in Vercel.

---

## A. Sito pubblico

| Route | Note |
|-------|------|
| `/` | Landing (o coming-soon se env) |
| `/prenota` | Wizard + mini-cart dock |
| `/appuntamento/[token]` | Gestisci / disdici (`noindex`) |
| `/privacy-policy` | Informativa |
| `/cookie-policy` | Cookie reali da codice |
| `/terms` | Termini / disdetta |
| `/gestionale` | Shell gestionale (`noindex`) |
| `/admin` | Redirect → `/gestionale` |

- Booking: `components/booking/FreshaBookingFlow.tsx` → `POST /api/bookings`
- Listino duale: `ServiceListino.tsx` (online vs consulenza WA)
- Mini-cart dock: stack anti-overlap FAB
- GDPR checkbox UI + Zod server; honeypot
- Banner cookie Accetta / Rifiuta / Personalizza
- JSON-LD HairSalon + orari da `SITE`

**Fix questo ciclo:** `app/robots.ts` + `app/sitemap.ts` dinamici; ICS UID = `getIcsUidDomain()` (hostname pubblico).

**Residui:** anchor gallery; doppia entry `/prenota` vs `#prenota`; Fonts terze parti.

---

## B. Gestionale

| Controllo | Stato |
|-----------|--------|
| Credenziali | `ADMIN_USER` (default username `admin`) / `ADMIN_PASSWORD` (solo env, nessun fallback) |
| Cookie | `polese_admin` HttpOnly + HMAC + expiry |
| Middleware | Cookie presence su `/api/admin/*` |
| Handler | `isAdminRequest()` su tutte le API dati |
| HTML `/gestionale` | Pubblico (solo form login) |

Funzioni: agenda, walk-in, blocchi, abbonamenti, clienti/CRM, servizi, notify, storico.

---

## C. Matrice API (sintesi)

| Path | Auth |
|------|------|
| `POST /api/bookings` | Pubblico + rate limit + Zod + honeypot + slot |
| `GET/DELETE /api/bookings/[token]` | Manage token + rate limit |
| `GET /api/availability`, `GET /api/catalog` | Pubblico read-only |
| `POST /api/admin/login` | Credenziali + rate limit |
| `POST /api/admin/logout` | Clear cookie |
| Altri `/api/admin/*` | **`isAdminRequest`** |

**Nessuna API dati admin senza auth server-side trovata.**  
Dettaglio storico: `docs/API_SECURITY_MATRIX.md`.

Limiti: rate-limit in-memory; CSP permissiva; password default se env assente.

---

## D. Conformità IT

| Coperto in prodotto | Da fare (titolare / consulente) |
|---------------------|----------------------------------|
| Privacy, cookie, terms, banner, checkbox | DPO, RoPA, DPIA |
| CF / P.IVA in config | DPA firmati (Vercel, Supabase, Google) |
| No GA/Pixel in codice | Self-host fonts; retention fiscale |
| | Informativa cartacea allineata |

**Questo file non certifica conformità legale.**

---

## E. Template .it / Cloudflare / rivendita

Guida operativa: **`docs/WHITE_LABEL_TEMPLATE.md`**.

1. Cambia `lib/site-config.ts` + `.env` (`NEXT_PUBLIC_SITE_URL`, Supabase, `ADMIN_*`)  
2. Asset in `public/`, listino in `lib/catalog.ts`, legali in `app/*-policy`  
3. Host tipico: **Vercel + DNS Cloudflare** sul `.it` (un redeploy) oppure VPS/Docker + Tunnel (`deploy-standalone.md`)  
4. Export: `npm run backup:offline` / `--template`

---

## F. Verdetto per analisi IA

| Area | Esito |
|------|--------|
| Front + booking + listino duale + dock | OK in codice |
| Gestionale feature | Completo salone |
| Auth API admin | **OK server-side** (non solo UI) |
| SEO host robots/sitemap | **Riparato (dinamico)** |
| ICS domain | **Riparato** |
| Default admin password | **Rischio se env vuota** |
| GDPR formale | UX sì / formalità no |
| White-label pack | Documentato + export |

*Aggiornare quando cambiano route o claim legali.*
