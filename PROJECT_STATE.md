# PROJECT_STATE — Felice Polese Barber Shop

**Updated:** 2026-09-04  
**Public URL:** https://felicepolesebarbershop.vercel.app  
**Vercel project:** `temporary-prompt-quasar-rndxhgh` (alias: felicepolesebarbershop)  
**Branch:** `cursor/production-ready-final-56a6`

## Status summary

| Area | Status |
|------|--------|
| Production site | **LIVE** (prior deploy) — homepage Felice branding, Maps Dante 44, listino, videos |
| Code tip | **READY** on `cursor/production-ready-final-56a6` — tests 209/209, build OK |
| Prod deploy tip | **BLOCKED** — Vercel free daily deploy quota (`api-deployments-free-per-day`) |
| Gmail SMTP | **READY** |
| Supabase bookings | **READY** — durations synced (migration 009 applied via API) |
| Smart booking | **READY** — all 10 services fixed durations, multi-service sum + buffer |
| Security | **READY** — cookies, honeypot, rate limits, session HMAC (from prior merge) |
| Intro scissors | **READY** — photoreal chrome PNG `/assets/3d/shear-intro.png` |
| Countdown | **READY** — stable digit grid alignment |

## Official durations (booking)

| Service | Min | Price |
|---------|-----|-------|
| Taglio Pro | 50 | 25€ |
| Taglio Standard | 30 | 15€ |
| Acconciatura | 15 | 5€ |
| Taglio Bambino | 20 | 10€ |
| Barba Pro | 20 | 15€ |
| Barba Standard | 15 | 5€ |
| Decolorazione Meches | 90 | 40–100€ |
| Decolorazione Cutanea | 120 | 50–120€ |
| Tintura Capelli | 60 | 10–30€ |
| Tintura Barba | 15 | 5–15€ |

Public label: **Durata prevista: X min** (not a guarantee). Variable **price** ranges unchanged.

## Deploy

- Project: **temporary-prompt-quasar-rndxhgh** only (NOT polesebarbershop)
- Alias: https://felicepolesebarbershop.vercel.app
- Next deploy: retry `vercel --prod --force` when quota resets

## Gestionale

- Tab **Listino** edits duration / price / active via `/api/admin/services` (HMAC session)
- Booking/availability read `lib/catalog.ts` seed + DB overlays (`lib/runtime-catalog.ts`)
