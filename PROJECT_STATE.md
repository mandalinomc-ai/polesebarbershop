# PROJECT_STATE — Felice Polese Barber Shop

**Updated:** 2026-09-04  
**Public URL:** https://felicepolesebarbershop.vercel.app  
**Vercel project:** `temporary-prompt-quasar-rndxhgh` (alias: felicepolesebarbershop)  
**Branch:** `cursor/update-durations-56a6`

## Status summary

| Area | Status |
|------|--------|
| Production site | **LIVE** — homepage Felice branding, Maps Dante 44, listino, videos |
| Code tip | **READY** on `cursor/update-durations-56a6` — new official durations |
| Multi-service booking | **READY** — combos sum silently (40/70/65/200/70/80), no engine jargon warnings |
| Gmail SMTP | **READY** |
| Supabase bookings | **READY** — migration `010_new_official_durations.sql` |
| Smart booking | **READY** — all 10 services fixed durations, buffer internal |
| Security | **READY** — cookies, honeypot, rate limits (no CAPTCHA) |

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
- Alias: https://felicepolesebarbershop.vercel.app
- Live catalog/availability **GO** via Supabase overlay sync (migration 010 applied)
- Code branch `cursor/update-durations-56a6` pushed (`2b1bf2b`); Vercel CLI prod deploy blocked by free-tier daily quota (`api-deployments-free-per-day`) — seed catalog will ship on next successful deploy
- Verified live: Tintura Barba 20, Tintura Capelli 30, Meches 150, Cutanea 180, Acconciatura 10; combos 70/80/200/40
