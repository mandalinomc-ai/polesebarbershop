# PROJECT_STATE — Felice Polese Barber Shop

**Updated:** 2026-09-03  
**Public URL:** https://felicepolesebarbershop.vercel.app  
**Vercel project:** `temporary-prompt-quasar-rndxhgh` (alias: felicepolesebarbershop)  
**Branch:** `cursor/gestionale-crm-final-6157`

## Status summary

| Area | Status |
|------|--------|
| Production site | **READY** — homepage 200, Felice branding, Maps Dante 44, listino, videos |
| Gmail SMTP | **READY** — `GMAIL_USER` + `GMAIL_APP_PASSWORD` on Production; live booking email verified |
| Supabase bookings | **READY** — test booking persisted |
| Next step | User review of inbox + later cleanup of unused Vercel projects |

## Deploy (2026-09-03)

- Project: **temporary-prompt-quasar-rndxhgh** only (NOT polesebarbershop)
- Force prod: `npx vercel --prod --yes --force`
- Deployment: `temporary-prompt-quasar-rndxhgh-k05uygvc8.vercel.app`
- Aliased: https://felicepolesebarbershop.vercel.app
- Inspect: https://vercel.com/mandalinomc-8144s-projects/temporary-prompt-quasar-rndxhgh/Fdi2MnFoUaZcw2Uz4UAbXSTTXRzE

## Env (names only — never log secret values)

Confirmed via `npx vercel env ls` on `temporary-prompt-quasar-rndxhgh`:

| Name | Production |
|------|------------|
| `GMAIL_APP_PASSWORD` | present (Secret) |
| `GMAIL_USER` | present |
| `BOOKING_NOTIFICATION_EMAIL` | present |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | present |
| `OWNER_EMAIL` / `ADMIN_EMAIL` | present (`felicepolese550@gmail.com`) |

## Email verification (2026-09-03)

Safe live POST to `/api/bookings` with customer email = owner only (`felicepolese550@gmail.com`):

- HTTP 200
- `ok: true`
- `persisted: true`
- `emailSent: true`
- `ownerNotified: true`
- `customerEmailFailed: false`
- `warnings: []`
- No GMAIL missing / skip errors

Service: Taglio Pro · Felice · 2026-09-09 08:30 (test row may remain in CRM — cancel from gestionale if desired).

## Site health checks (2026-09-03)

- Homepage HTTP **200**
- Brand: Felice Polese present
- Maps: Corso Dante Alighieri, **44** (Benevento)
- Listino / prices present (e.g. 50 €)
- Videos: `/video/*.mp4` returning 200
- `/prenota` HTTP 200

## Booking system

| Component | Status |
|-----------|--------|
| Stack | Next.js 15 + Supabase + Gmail SMTP (.ics) |
| Supabase | `dbbncprluqjrofjemfbg.supabase.co` |
| Cancellation | 30 minutes before |
| Opening | 2026-09-07 |
| Admin | `/gestionale` |
| Public booking | `/prenota` |

## Site config highlights

- Official name: **Felice Polese Barber Shop**
- Tagline: **Modern Barbering & Fade Studio**
- Address: Corso Dante Alighieri, 44, 82100 Benevento
- Phone/WhatsApp: +39 327 015 6225
- Instagram: @felicepolese_barber

## Still later (non-blocking)

1. User reviews Gmail inbox for the test confirmation + owner alert
2. Cleanup unused / duplicate Vercel projects (e.g. polesebarbershop) when Felice confirms
3. Optional: cancel leftover test appointment from gestionale
