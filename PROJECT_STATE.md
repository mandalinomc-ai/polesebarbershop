# PROJECT_STATE — Felice Polese Barber Shop

**Updated:** 2026-09-02  
**Repo:** [mandalinomc-ai/polesebarbershop](https://github.com/mandalinomc-ai/polesebarbershop)

## GitHub

| Field | Value |
|-------|-------|
| Default branch | `main` @ `9c721e7`+ (this PR on top) |
| `master` | Fast-forwarded to `9c721e7` on 2026-09-02 (was stale Polese Barbershop / Dante 44). Vercel treats `master` as **Preview**, not Production. |

### Code on `main` (verified)

- Name: **Felice Polese Barber Shop**
- Tagline: **MODERN BARBERING & FADE STUDIO**
- Address: Corso Dante **45**, Benevento
- Booking: `/prenota` + `/api/availability` + `/api/bookings`
- Cancellation: 30 minutes (`CANCEL_MINUTES_BEFORE`)
- Opening date: 2026-09-07

## Live URLs (2026-09-02)

| URL | What it serves now |
|-----|-------------------|
| `https://polesebarbershop-at512kktm-mandalinomc-8144s-projects.vercel.app` | **CORRECT** current `main` (title with Barber Shop, Dante 45, `/prenota` 200, videos 200). Availability API runs but preview env may lack Supabase (`database non configurato`). |
| `https://polesebarbershop.vercel.app` | **STALE** — `Felice Polese \| Modern Barbering & Fade Studio`, Dante **44**, `/prenota` 404 |
| `https://felicepolesebarbershop.vercel.app` | **STALE** — same old site as above |
| `https://polesebarbershop-mandalinomc-8144s-projects.vercel.app` | **STALE** — current *assigned* production of the Git-connected project (auto-assign off) |

GitHub Deployments: Vercel Git App **does** build `main` as `Production – polesebarbershop` / `Production – felicepolesebarbershop`, but `production_environment: false` and domains are **not** switched (staged production).

## Vercel projects

| Project | Role | Project ID | Git production builds |
|---------|------|------------|------------------------|
| **polesebarbershop** | Canonical | `prj_E4dMpfR7ExzCAwNGH2MwO30jsqAf` | Yes, from this repo `main` |
| **felicepolesebarbershop** / legacy **felicepolese** | Owns `felicepolesebarbershop.vercel.app` | unknown | Also connected to this repo |

## CI

`.github/workflows/vercel-production.yml` — CLI deploy on `main` **only if** `VERCEL_TOKEN` is set. Secrets were empty, so every push failed; the workflow now skips instead of going red.

Vercel Git integration is the real build path. `vercel.json` `github.autoAlias: true` restores domain assignment on production deploys.

## Booking / email (unchanged)

| Component | Status |
|-----------|--------|
| Stack | Next.js 15 App Router + Supabase + Resend (.ics) |
| Supabase | `dbbncprluqjrofjemfbg.supabase.co` |
| Cancel window | 30 minutes |
| Admin | `/gestionale` |
| Resend | Test mode `onboarding@resend.dev`; `polesebarbershop.it` not verified |

## What is NOT done until domains switch

1. Public `.vercel.app` hosts still serve the old Dante-44 site
2. GitHub Actions CLI deploy still needs secrets if you want a second deploy path
3. Resend custom domain not verified
4. Preview unique URL may not have production Supabase env (check `/api/availability` after alias)

## Site config highlights

- Official name: **Felice Polese Barber Shop**
- Canonical URL in code: `https://polesebarbershop.vercel.app`
- Phone/WhatsApp: +39 351 252 3087
- Instagram: @felicepolese_barber
