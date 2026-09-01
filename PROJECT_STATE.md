# PROJECT_STATE — Felice Polese Barber Shop

**Updated:** 2026-09-01 (final deploy attempt — commit `559fb41`)  
**Repo:** [mandalinomc-ai/polesebarbershop](https://github.com/mandalinomc-ai/polesebarbershop)

## GitHub `main`

| Field | Value |
|-------|-------|
| HEAD | `559fb41` — *docs: add continuity docs for Vercel deploy and domain alias* |
| Branch | `main` (clean working tree) |
| Verified | ✓ `git status` clean, on `main`, at `559fb41` |

### Recent commits (newest first)

```
559fb41 docs: add continuity docs for Vercel deploy and domain alias
1a29103 fix: enforce 30-minute cancellation window server-side
f02f76c chore: remove dead CSS and unused hero/product images
b5cef50 ci: run Vercel production deploy on every main push (was skipped)
a5fe950 fix: intro dark reveal, visible countdown numbers, silver scissors deploy
```

## Vercel projects

| Project | Role | Project ID (known) | Default URL | Live branding |
|---------|------|-------------------|-------------|---------------|
| **polesebarbershop** | **NEW — canonical** | `prj_E4dMpfR7ExzCAwNGH2MwO30jsqAf` (from CI workflow) | `polesebarbershop.vercel.app` | **Felice Polese Barber Shop** ✓ |
| **felicepolese** (legacy) | **OLD — domain to reassign** | unknown (separate Vercel project) | `felicepolesebarbershop.vercel.app` | **Polese Barbershop** (stale) ✗ |

### Domain verification (2026-09-01 — final deploy attempt)

```bash
curl -s https://felicepolesebarbershop.vercel.app | grep -oE 'Felice Polese Barber Shop|Modern Barbering|Polese Barbershop' | sort -u
# → Polese Barbershop  (WRONG — old deploy, alias NOT updated)

curl -s https://polesebarbershop.vercel.app | grep -oE 'Felice Polese Barber Shop|Modern Barbering|Polese Barbershop' | sort -u
# → Felice Polese Barber Shop  (CORRECT)
```

**STATUS: NOT READY** — `felicepolesebarbershop.vercel.app` does not show new branding.

### Final deploy attempt (2026-09-01)

| Step | Result |
|------|--------|
| Git on `main` @ `559fb41` | ✓ |
| `npx vercel whoami` | ✗ Logged out |
| `npx vercel link --project polesebarbershop` | **Skipped** (auth blocker) |
| `npx vercel --prod` | **Skipped** (auth blocker) |
| `npx vercel alias set … felicepolesebarbershop.vercel.app` | **Skipped** (auth blocker) |

### CI deploy status

Workflow: `.github/workflows/vercel-production.yml` — runs on every `main` push.

**Status: FAILING** — GitHub secrets not configured:

- `VERCEL_TOKEN` — empty
- `VERCEL_ORG_ID` — empty
- `VERCEL_PROJECT_ID` — empty

### Cloud Vercel CLI

- `npx vercel whoami` → **Logged out**
- No `VERCEL_TOKEN` in cloud environment
- Deploy/alias requires user `npx vercel login` locally or GitHub secrets

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
- Tagline: **Modern Barbering & Fade Studio**
- Canonical URL in code default: `https://polesebarbershop.vercel.app`
- Address: Corso Dante 45, 82100 Benevento
- Phone/WhatsApp: +39 351 252 3087
- Instagram: @felicepolese_barber

## What is NOT done

1. `felicepolesebarbershop.vercel.app` still serves the **old** Polese Barbershop project
2. Vercel CLI auth blocked cloud deploy (logged out)
3. GitHub → Vercel CI secrets missing — auto-deploy on push broken
4. Resend custom domain not verified (emails to felicepolese550@gmail.com blocked until then)

## Related branches (context)

Many `cursor/*` feature branches exist; production truth is `main` at `559fb41+`.
