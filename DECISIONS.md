# DECISIONS — Felice Polese infrastructure

**Updated:** 2026-09-02

## D1 — Canonical public URL: `polesebarbershop.vercel.app`

**Decision:** Production for GitHub `main` is the Vercel project **polesebarbershop** (`prj_E4dMpfR7ExzCAwNGH2MwO30jsqAf`).

As of 2026-09-02 this hostname **serves the current site** (autoAlias on). Share this URL.

## D2 — Legacy hostname `felicepolesebarbershop.vercel.app`

**Decision:** Still attached to a **separate** Vercel project. Do not rebuild that app. After CLI login:

```bash
npx vercel alias set https://polesebarbershop.vercel.app felicepolesebarbershop.vercel.app
```

(`scripts/promote-live-domains.sh`)

## D3 — Staged production was the outage

Git built `main` on unique URLs while public aliases stayed on an old Dante-44 deploy. **`github.autoAlias: true`** in `vercel.json` made the next production Git deploy assign domains on the polesebarbershop project.

`master` is not the production branch (pushing it created Preview only).

## D4 — GitHub Actions CLI is optional

Skip the workflow when `VERCEL_TOKEN` is missing. Vercel Git is the source of production builds.

## D5 — Do not change booking/design for deploy work

Honored. Booking, visuals, and Supabase schema were not modified in this pass.

## D6 — Production env vars still required for real bookings

The new project’s production deployment does **not** have `SUPABASE_*` / `RESEND_*` set. Until `./scripts/vercel-configure-production.sh` (or the dashboard) is run, the calendar is local-only.

## D7 — URL strategy

| URL | State 2026-09-02 |
|-----|------------------|
| `polesebarbershop.vercel.app` | Current `main` — use this |
| Team `*.vercel.app` | Same production |
| `felicepolesebarbershop.vercel.app` | Old site — alias still needed |
| `polesebarbershop.it` | Future DNS + Resend |
