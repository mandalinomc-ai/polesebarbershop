# NEXT ACTION

**Updated:** 2026-09-02  
**Goal:** Public domains must serve the current `main` site (Felice Polese Barber Shop, Corso Dante 45, `/prenota`).

## What is already done

The latest Git production build is **ready** (commit `9c721e7`):

https://polesebarbershop-at512kktm-mandalinomc-8144s-projects.vercel.app

That URL has the correct title, address 45, videos, and `/prenota`.

## Blocker

`polesebarbershop.vercel.app` and `felicepolesebarbershop.vercel.app` still point at a **staged-old** deployment (title `Felice Polese | Modern Barbering & Fade Studio`, Corso Dante 44, no `/prenota`).

Vercel Git builds `main` as production but **does not auto-assign domains** (staged production). CLI alias needs `vercel login`.

## Path A — if Vercel CLI is logged in

```bash
npx vercel alias set https://polesebarbershop-at512kktm-mandalinomc-8144s-projects.vercel.app polesebarbershop.vercel.app
npx vercel alias set https://polesebarbershop-at512kktm-mandalinomc-8144s-projects.vercel.app felicepolesebarbershop.vercel.app
```

Or: `./scripts/promote-live-domains.sh`

## Path B — this PR (`github.autoAlias: true`)

Merging to `main` tells Vercel for GitHub to assign production domains on the next production deploy. `vercel.json` now sets `"github": { "autoAlias": true }`.

## Verify READY

```bash
curl -sL https://felicepolesebarbershop.vercel.app | grep -o 'Felice Polese Barber Shop' | head -1
curl -sI https://felicepolesebarbershop.vercel.app/prenota | head -1
curl -sL https://polesebarbershop.vercel.app | grep -o 'Corso Dante 45' | head -1
```

**READY** when both domains show `Felice Polese Barber Shop`, `Corso Dante 45`, and `/prenota` is HTTP 200.

## Optional GitHub secrets (CLI workflow)

Only needed if you want GitHub Actions to run `vercel deploy --prod` in addition to Vercel Git:

| Secret | Value |
|--------|-------|
| `VERCEL_TOKEN` | https://vercel.com/account/tokens |
| `VERCEL_ORG_ID` | Project Settings → General |
| `VERCEL_PROJECT_ID` | `prj_E4dMpfR7ExzCAwNGH2MwO30jsqAf` |
