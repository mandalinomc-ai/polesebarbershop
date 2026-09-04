# PROJECT_STATE — Felice Polese Barber Shop

**Updated:** 2026-09-04  
**Public URL:** https://felicepolesebarbershop.vercel.app  
**Vercel project:** `temporary-prompt-quasar-rndxhgh` (alias: felicepolesebarbershop)  
**Branch:** `cursor/smart-booking-v2-56a6`

## Status summary

| Area | Status |
|------|--------|
| Production site | **READY** — homepage 200, Felice branding, Maps Dante 44, listino, videos |
| Gmail SMTP | **READY** — `GMAIL_USER` + `GMAIL_APP_PASSWORD` on Production |
| Supabase bookings | **READY** |
| Smart booking engine | **LIVE** — free-windows + smart thinned slots on `/api/availability` |
| Migration 007 | **APPLIED** (2026-09-04) — `appointments.duration_override_min` |
| Taglio Pro | **25 € / 50 min** (catalog + DB + live site) |
| Next step | User reviews inbox / gestionale as needed |

## Migration 007 (2026-09-04)

- File: `supabase/migrations/007_duration_override.sql`
- Applied on production Supabase `dbbncprluqjrofjemfbg` via `psql` (pooler)
- Column verified: `duration_override_min integer NULL` + check `> 0`
- Write path verified: insert/read/patch/delete with override (test row removed)
- Redeploy **not** required (DB-only)

## Deploy

- Project: **temporary-prompt-quasar-rndxhgh** only (NOT polesebarbershop)
- Aliased: https://felicepolesebarbershop.vercel.app

## Booking system

| Component | Status |
|-----------|--------|
| Stack | Next.js 15 + Supabase + Gmail SMTP (.ics) |
| Supabase | `dbbncprluqjrofjemfbg.supabase.co` |
| Cancellation | 30 minutes before |
| Opening | 2026-09-07 |
| Admin | `/gestionale` |
| Public booking | `/prenota` |
| Engine | Smart free-windows (`lib/booking/*`); online display interval 15 min |

## Site config highlights

- Official name: **Felice Polese Barber Shop**
- Tagline: **Modern Barbering & Fade Studio**
- Address: Corso Dante Alighieri, 44, 82100 Benevento
- Phone/WhatsApp: +39 327 015 6225
- Instagram: @felicepolese_barber

## Still later (non-blocking)

1. User reviews Gmail inbox for confirmation emails as needed
2. Cleanup unused / duplicate Vercel projects (e.g. polesebarbershop) when Felice confirms
