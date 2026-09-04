# PROJECT_STATE — Felice Polese Barber Shop

**Updated:** 2026-09-04  
**Public URL:** https://felicepolesebarbershop.vercel.app  
**Vercel project:** `temporary-prompt-quasar-rndxhgh` (alias: felicepolesebarbershop)  
**Branch:** `cursor/client-ux-polish-56a6` (`ac5749c`)

## Status summary

| Area | Status |
|------|--------|
| Production site | **LIVE** on alias `0aa116c` (preview-bug fix) — not client UX polish tip |
| Client UX polish tip | **READY** code / **NO-GO** deploy — Hobby `api-deployments-free-per-day`; no build of `ac5749c` exists |
| Official durations | **LIVE** via Supabase catalog overlay |
| Multi-service booking | **READY** — silent Italian UX on tip; combos sum |
| Gmail SMTP | **READY** |
| Supabase bookings | **READY** — migration `010_new_official_durations.sql` |
| Smart booking | **READY** — all 10 services fixed durations, buffer internal |
| Security | **LIVE** enough for `/cookie-policy` 200 on current alias |

## Official durations (booking)

| Service | Min | Price | Notes |
|---------|-----|-------|-------|
| Taglio Pro | 50 | 25€ | unchanged |
| Taglio Standard | 30 | 15€ | unchanged |
| Acconciatura | **10** | 5€ | was 15 |
| Taglio Bambino | 20 | 10€ | confirmed |
| Barba Pro | 20 | 15€ | unchanged |
| Barba Standard | 15 | 5€ | unchanged |
| Decolorazione Meches | **150** | 40–100€ | was 90 (2h30) |
| Decolorazione Cutanea | **180** | 50–120€ | was 120 (3h) |
| Tintura Capelli | **30** | 10–30€ | was 60 (nero/castano = same service) |
| Tintura Barba | **20** | 5–15€ | was 15 (nero/castano = same service) |

Public label: **Durata prevista: X min** (sums on multi-select). Variable **price** ranges unchanged. All `durationKnown: true`.

## Multi-service combos (verified)

| Combo | Min |
|-------|-----|
| Taglio Standard + Acconciatura | 40 |
| Taglio Pro + Barba Pro | 70 |
| Taglio Pro + Barba Standard | 65 |
| Taglio Pro + Decolorazione Meches | 200 |
| Taglio Pro + Tintura Barba | 70 |
| Taglio Pro + Tintura Capelli | 80 |

## Deploy

- Project: **temporary-prompt-quasar-rndxhgh** only (NOT polesebarbershop)
- Alias: https://felicepolesebarbershop.vercel.app → currently `dpl_58…` / `0aa116c`
- Live catalog/availability **GO** via Supabase (migration 010)
- Client UX polish (`ac5749c`, PR #27): **NO-GO until quota resets** — alias alone cannot ship (no deployment of tip SHA). One timer set for single retry. See `docs/DEPLOY_STATUS.md`.
- Verified live durations: Tintura Barba 20, Tintura Capelli 30, Meches 150, Cutanea 180, Acconciatura 10
