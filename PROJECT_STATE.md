# PROJECT_STATE — Felice Polese Barber Shop

**Updated:** 2026-09-02 (production domain assigned)  
**Repo:** [mandalinomc-ai/polesebarbershop](https://github.com/mandalinomc-ai/polesebarbershop)

## GitHub

| Field | Value |
|-------|-------|
| Default branch | `main` @ `baad59b` (`github.autoAlias: true`) |
| `master` | Fast-forwarded to `9c721e7` then `main` moved on; Vercel treats `master` as Preview |

## Live URLs (2026-09-02, verified in browser)

| URL | Status |
|-----|--------|
| https://polesebarbershop.vercel.app | **READY** — Felice Polese Barber Shop, Dante 45, scissors intro, countdown, `/prenota` wizard |
| https://polesebarbershop-mandalinomc-8144s-projects.vercel.app | Same current production |
| https://felicepolesebarbershop.vercel.app | **STALE** — old site, Dante 44, `/prenota` 404 (other Vercel project) |

Production Git deployment for `baad59b`:  
https://polesebarbershop-7l87mufey-mandalinomc-8144s-projects.vercel.app

## Booking on production

Wizard works. `/api/availability` returns 121 slots for 2026-09-08 but with warning **database non configurato** (Supabase env not set on this Vercel project). Local calendar mode only until env vars are copied.

Assets: `/assets/videos/felice-working.mp4` and `/assets/video/taglio-01.mp4` → 200.

## CI

`.github/workflows/vercel-production.yml` skips CLI deploy when `VERCEL_TOKEN` is empty. Last run on `baad59b`: **success** (skipped). Vercel Git is the builder.

## Vercel projects

| Project | Role |
|---------|------|
| **polesebarbershop** `prj_E4dMpfR7ExzCAwNGH2MwO30jsqAf` | Canonical; now serving public `polesebarbershop.vercel.app` |
| **felicepolesebarbershop** (legacy) | Still owns `felicepolesebarbershop.vercel.app` |

## Email / Supabase

Unchanged: Resend test mode; `polesebarbershop.it` not verified; Supabase project `dbbncprluqjrofjemfbg` exists but is **not wired** on the new Vercel project env.

## Site config

- Name: **Felice Polese Barber Shop**
- Opening: 2026-09-07
- Address: Corso Dante 45, Benevento
- Phone: +39 351 252 3087
- Cancel window: 30 minutes
