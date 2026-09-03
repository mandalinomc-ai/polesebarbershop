# DECISIONS — Felice Polese infrastructure

**Updated:** 2026-09-01 (final deploy attempt — commit `559fb41`)

## D1 — Canonical Vercel project: `polesebarbershop` (NEW)

**Decision:** All new deploys go to the Vercel project **`polesebarbershop`**.

- Project ID: `prj_E4dMpfR7ExzCAwNGH2MwO30jsqAf`
- Production URL: `https://polesebarbershop.vercel.app`
- Serves the premium rebuild with **Felice Polese Barber Shop** branding
- `NEXT_PUBLIC_SITE_URL` in Vercel production env should be `https://polesebarbershop.vercel.app` (or eventually the custom domain)

**Rationale:** This project is linked to the current GitHub repo and CI workflow. It already shows the correct site.

## D2 — Legacy domain: `felicepolesebarbershop.vercel.app` (OLD project)

**Decision:** `felicepolesebarbershop.vercel.app` belongs to a **separate, older Vercel project** (internally "felicepolese") that still serves **Polese Barbershop** branding.

**Action required:** Reassign the alias so `felicepolesebarbershop.vercel.app` points to the latest `polesebarbershop` production deployment:

```bash
npx vercel alias set <polesebarbershop-deploy-url> felicepolesebarbershop.vercel.app
```

**Do NOT** rebuild the old project. **Do NOT** change application code for this — it is purely a Vercel alias/routing fix.

## D3 — Cloud vs local Vercel authentication

**Decision:** Vercel deploy and alias operations require an authenticated Vercel account. Two paths:

| Path | Works? | Notes |
|------|--------|-------|
| **Cloud agent `vercel login`** | Blocked | `npx vercel whoami` → Logged out (2026-09-01). OAuth device flow needs a human to visit `vercel.com/oauth/device` and approve. |
| **Cloud `VERCEL_TOKEN` env** | Not available | No token injected in cloud VM. |
| **GitHub Actions secrets** | Not configured | `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` all empty → CI deploy fails. |
| **User local PC** | **Preferred** | User runs `vercel login` interactively, then `link`, `deploy`, `alias`. |

**Rationale:** Vercel CLI auth is account-bound. Cloud agents cannot complete browser OAuth without user action. Local terminal is the reliable path until GitHub secrets are set.

## D4 — GitHub CI for production deploys

**Decision:** `.github/workflows/vercel-production.yml` deploys `main` to `polesebarbershop` on every push, using:

- `VERCEL_TOKEN` — personal/team token from https://vercel.com/account/tokens
- `VERCEL_ORG_ID` — team/user ID
- `VERCEL_PROJECT_ID` — `prj_E4dMpfR7ExzCAwNGH2MwO30jsqAf`

**Status:** Workflow exists but secrets are missing. Until configured, deploys must be manual (local CLI).

## D5 — Do not change code for deploy tasks

**Decision:** Deploy/alias/domain work is **infrastructure only**. Do not modify:

- Booking logic or Supabase schema
- Site design, copy, or assets
- Gmail SMTP/Supabase env configuration in code

Continuity docs and Vercel routing are the scope.

## D6 — Supabase & Gmail SMTP

- Supabase: single project `dbbncprluqjrofjemfbg` — appointments, barbers, services, CRM
- Gmail SMTP via nodemailer (App Password auth) — replaces Resend
- 30-minute online cancellation enforced at all layers (app + API + DB)

## D7 — URL strategy (target state)

| URL | Target |
|-----|--------|
| `polesebarbershop.vercel.app` | Primary Vercel production URL |
| `felicepolesebarbershop.vercel.app` | Alias → same deployment as above |
| `polesebarbershop.it` (future) | Custom domain after DNS verification |
