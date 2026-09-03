# PROJECT_STATE — Felice Polese Barber Shop

**Updated:** 2026-09-02  
**Public URL:** https://felicepolesebarbershop.vercel.app  
**Vercel project:** `temporary-prompt-quasar-rndxhgh` (GitHub connected)

## Overwrite (admitted)

Live was briefly the scissors GitHub rebuild. That is **not** the site the client liked.

## Restore

- Domain aliased to oldest remaining quasar production (`6ve62mbnk`, marble July-3).
- Git branch reconstructs Jakarta marble (`0da4547` + Google Fonts + `/video/`) **with** booking, Maps Dante 45, WhatsApp 327.
- Exact pre-overwrite HTML (`Felice Polese | Modern Barbering & Fade Studio` with `marble-accent` / `glass-card` from Google Fonts static page) was **not** in the repo.

## Do not

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
| Stack | Next.js 15 App Router + Supabase + Gmail SMTP (.ics attachments) |
| Supabase project | `dbbncprluqjrofjemfbg.supabase.co` |
| Migrations | `001_schema.sql`, `002_crm_indexes.sql`, `002_cancel_30_min.sql`, `003_service_display_names.sql` |
| Cancellation policy | **30 minutes** — enforced in app (`CANCEL_MINUTES_BEFORE`), API, and DB function `cancel_appointment_by_token` |
| Booking horizon | 365 days open; UI shows 42-day scroller |
| Opening date | 2026-09-07 (countdown on homepage) |
| Admin | `/gestionale` (cookie session) |
| Public booking | `/prenota` |

### Email (Gmail SMTP)

- From: `Felice Polese Barber Shop <felicepolese550@gmail.com>`
- Admin/owner: `felicepolese550@gmail.com`
- BOOKING_NOTIFICATION_EMAIL: `felicepolese550@gmail.com`
- Email sent via Gmail SMTP (nodemailer)

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
4. Gmail App Password must be configured on Vercel (GMAIL_USER, GMAIL_APP_PASSWORD)

## Related branches (context)

Many `cursor/*` feature branches exist; production truth is `main` at `559fb41+`.
