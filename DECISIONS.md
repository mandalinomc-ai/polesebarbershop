# DECISIONS — Felice Polese infrastructure

**Updated:** 2026-09-02

## D1 — Canonical Vercel project: `polesebarbershop`

**Decision:** All new deploys go to Vercel project **`polesebarbershop`**.

- Project ID: `prj_E4dMpfR7ExzCAwNGH2MwO30jsqAf`
- Intended production URL: `https://polesebarbershop.vercel.app`
- Latest **built** deployment (2026-09-01, commit `9c721e7`):  
  `https://polesebarbershop-at512kktm-mandalinomc-8144s-projects.vercel.app`

## D2 — Legacy domain `felicepolesebarbershop.vercel.app`

**Decision:** That hostname belongs to a second Vercel project also linked to this GitHub repo (`Production – felicepolesebarbershop` in GitHub Deployments). Do **not** rebuild a separate app. Point the alias at the same `main` deployment as D1.

## D3 — Root cause of “main is built but live is old”

**Decision:** Vercel is running **staged production**: Git pushes to `main` create production *builds* (unique `*.vercel.app` URLs) but **do not auto-assign** the project domains. Confirmed 2026-09-02:

- Unique prod build = new site (Barber Shop, Dante 45, `/prenota`)
- `polesebarbershop.vercel.app` and the team URL `polesebarbershop-mandalinomc-8144s-projects.vercel.app` = old site (Dante 44, no booking)

`master` is **not** the production branch (pushing `main` → `master` created a **Preview** only).

**Fix in repo:** `vercel.json` `"github": { "autoAlias": true }` so the next production Git deploy assigns domains.

**Fix with CLI (if logged in):** `scripts/promote-live-domains.sh` / `vercel alias set <deploy-url> <domain>`.

## D4 — Cloud vs local Vercel authentication

CLI alias/promote still needs an account. Cloud `npx vercel whoami` is logged out unless the user completes device OAuth (`https://vercel.com/oauth/device`). No `VERCEL_TOKEN` in the cloud VM.

## D5 — GitHub Actions CLI deploy is optional

**Decision:** Vercel Git is the primary builder. The Actions workflow must **not** fail the repo when secrets are missing. Skip the CLI job unless `VERCEL_TOKEN` is set.

## D6 — Do not change booking/design for deploy work

Deploy/alias/domain work is infrastructure. Do not modify booking logic, Supabase schema, or visual design for this task.

## D7 — URL strategy (target state)

| URL | Target |
|-----|--------|
| Unique Git production URL | Already correct `main` |
| `polesebarbershop.vercel.app` | Same deployment (autoAlias or `alias set`) |
| `felicepolesebarbershop.vercel.app` | Same deployment |
| `polesebarbershop.it` (future) | Custom domain after DNS + Resend verification |
