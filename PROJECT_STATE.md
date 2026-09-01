# PROJECT_STATE — Felice Polese Barber Shop

**Updated:** 2026-09-01 (cloud agent session)  
**Repo:** [mandalinomc-ai/polesebarbershop](https://github.com/mandalinomc-ai/polesebarbershop)

## GitHub `main`

| Field | Value |
|-------|-------|
| HEAD | `1a29103` — *fix: enforce 30-minute cancellation window server-side* |
| Branch | `main` (clean working tree at session start) |
| Recent stack | Premium rebuild → silver scissors/countdown → CI deploy workflow → 30-min cancel enforcement |

### Recent commits (newest first)

```
1a29103 fix: enforce 30-minute cancellation window server-side
f02f76c chore: remove dead CSS and unused hero/product images
b5cef50 ci: run Vercel production deploy on every main push (was skipped)
a5fe950 fix: intro dark reveal, visible countdown numbers, silver scissors deploy
a2df3c3 Merge cursor/real-content-premium-56a6: premium rebuild with real content
```

## Vercel projects

| Project | Role | Project ID (known) | Default URL | Live branding |
|---------|------|-------------------|-------------|---------------|
| **polesebarbershop** | **NEW — canonical** | `prj_E4dMpfR7ExzCAwNGH2MwO30jsqAf` (from CI workflow) | `polesebarbershop.vercel.app` | **Felice Polese Barber Shop** ✓ |
| **felicepolese** (legacy) | **OLD — domain to reassign** | unknown (separate Vercel project) | `felicepolesebarbershop.vercel.app` | **Polese Barbershop** (stale) ✗ |

### Domain verification (2026-09-01)

```bash
curl -s https://felicepolesebarbershop.vercel.app | grep -o 'Felice Polese Barber Shop\|Polese Barbershop' | head -1
# → Polese Barbershop  (WRONG — old deploy)

curl -s https://polesebarbershop.vercel.app | grep -o 'Felice Polese Barber Shop' | head -1
# → Felice Polese Barber Shop  (CORRECT)
```

**Page titles confirm the split:**

- `felicepolesebarbershop.vercel.app` → *Polese Barbershop — L'Arte della Barberia d'Élite*
- `polesebarbershop.vercel.app` → *Felice Polese Barber Shop — L'Arte della Barberia Sartoriale*

### CI deploy status

Workflow: `.github/workflows/vercel-production.yml` — runs on every `main` push.

**Status: FAILING** — GitHub secrets not configured:

- `VERCEL_TOKEN` — empty
- `VERCEL_ORG_ID` — empty
- `VERCEL_PROJECT_ID` — empty

Last failed run: `33559903937` on commit `1a29103`.

### Cloud Vercel CLI

- `npx vercel whoami` → **Logged out**
- `npx vercel login` → device URL issued (`https://vercel.com/oauth/device?user_code=HGGF-GJCF`) but **no user completed OAuth** within timeout
- No `VERCEL_TOKEN` in cloud environment
- `.vercel/` exists locally (gitignored); anonymous deploy token expired

## Booking system

| Component | Status |
|-----------|--------|
| Stack | Next.js 15 App Router + Supabase + Resend (.ics attachments) |
| Supabase project | `dbbncprluqjrofjemfbg.supabase.co` |
| Migrations | `001_schema.sql`, `002_crm_indexes.sql`, `002_cancel_30_min.sql`, `003_service_display_names.sql` |
| Cancellation policy | **30 minutes** — enforced in app (`CANCEL_MINUTES_BEFORE`), API, and DB function `cancel_appointment_by_token` |
| Booking horizon | 365 days open; UI shows 42-day scroller |
| Opening date | 2026-09-07 (countdown on homepage) |
| Admin | `/gestionale` (cookie session) |
| Public booking | `/prenota` |

### Email (Resend)

- From (test mode): `Felice Polese Barber Shop <onboarding@resend.dev>`
- Admin/owner: `felicepolese550@gmail.com`
- NOTIFY_EMAIL (Resend account inbox until domain verified): `mandalinomc@gmail.com`
- Custom domain `polesebarbershop.it` **not yet verified** in Resend

## Site config highlights

- Official name: **Felice Polese Barber Shop**
- Canonical URL in code default: `https://polesebarbershop.vercel.app`
- Address: Corso Dante 45, 82100 Benevento
- Phone/WhatsApp: +39 351 252 3087
- Instagram: @felicepolese_barber

## Tests & build

| Check | Result |
|-------|--------|
| `npm test` | **103 passed** (19 test files, vitest) |
| `npm run build` | **PASS** — Next.js 15.5.24, 9 static pages + API routes |

## What is NOT done

1. `felicepolesebarbershop.vercel.app` still serves the **old** Polese Barbershop project
2. GitHub → Vercel CI secrets missing — auto-deploy on push broken
3. Cloud agent cannot complete Vercel OAuth device flow without user interaction
4. Resend custom domain not verified (emails to felicepolese550@gmail.com blocked until then)

## Related branches (context)

Many `cursor/*` feature branches exist; production truth is `main` at `1a29103+`.
