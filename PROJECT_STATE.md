# PROJECT_STATE — Felice Polese Barber Shop

**Updated:** 2026-09-25  
**Public URL:** https://felicepolesebarbershop.it  
**Hosting:** VPS Aruba `94.177.161.26` (Docker Compose + Nginx)  
**Branch tip:** vedi git `main` / PRs `cursor/*-56a6`

## Status summary

| Area | Status |
|------|--------|
| Production site | **LIVE** su VPS / dominio `.it` |
| Vercel | **Non più target di produzione** |
| Official durations | **LIVE** via Supabase catalog overlay |
| Multi-service booking | **READY** |
| Email | Aruba SMTP (`smtps.aruba.it:465`) |
| WhatsApp | E.164 +39 sanitization on all send paths |
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
| Taglio Bambino | 20 | 12€ | confirmed |
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
- Alias: https://felicepolesebarbershop.it → currently `dpl_58…` / `0aa116c`
- Live catalog/availability **GO** via Supabase (migration 010)
- Client UX polish (`ac5749c`, PR #27): **NO-GO until quota resets** — alias alone cannot ship (no deployment of tip SHA). One timer set for single retry. See `docs/DEPLOY_STATUS.md`.
- Verified live durations: Tintura Barba 20, Tintura Capelli 30, Meches 150, Cutanea 180, Acconciatura 10
