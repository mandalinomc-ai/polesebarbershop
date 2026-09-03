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
| Supabase bookings | **READY** — test rows cleaned; real Ludovica booking kept |
| Taglio Pro | **25 € / 50 min** (user correction) |
| Scissors intro | Restored (silver/black, skippable, reduced-motion safe) |
| Next step | Final polish deploy on this branch |

## Deploy (2026-09-03)

- Project: **temporary-prompt-quasar-rndxhgh** only (NOT polesebarbershop)
- Force prod: `npx vercel --prod --yes --force`
- Aliased: https://felicepolesebarbershop.vercel.app

## Email verification (2026-09-03)

Safe live POST to `/api/bookings` with customer email = owner only (`felicepolese550@gmail.com`) was verified earlier.
Owner/test appointments (`felicepolese550@gmail.com`, junk `polesegay@sega.it`) were **deleted** from Supabase.
Confirmed customer booking **Ludovica Covino** kept.

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

## Final polish deploy (2026-09-03 evening)

- Branch: `cursor/final-polish-deploy-c959`
- Force prod: `npx vercel --prod --yes --force` → **temporary-prompt-quasar-rndxhgh**
- Aliased: https://felicepolesebarbershop.vercel.app
- Inspect: https://vercel.com/mandalinomc-8144s-projects/temporary-prompt-quasar-rndxhgh/JAUPBiJNe6qBnEtwh7ZavKYiaL3T
- Verified live: Taglio Pro **25 € / 50 min**, scissors intro JS+CSS, countdown-digit 1ch, Maps Dante 44, WhatsApp
