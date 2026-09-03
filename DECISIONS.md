# DECISIONS — Felice Polese infrastructure

**Updated:** 2026-09-02 (overwrite admitted; marble restored)

## What went wrong

A GitHub production deploy of **current main** (scissors intro, title `Felice Polese Barber Shop — MODERN BARBERING…`) was aliased onto **https://felicepolesebarbershop.vercel.app**. That overwrote the marble page the client liked.

Hobby Vercel cannot `vercel rollback` past the previous production (402). The live domain was pointed back to the oldest remaining production on `temporary-prompt-quasar-rndxhgh`:

`temporary-prompt-quasar-rndxhgh-6ve62mbnk-anon-phi-vert.vercel.app`

That deploy is July-3 / “Polese Barbershop — L'Arte della Barberia d'Élite” (hero-bg, Dante Alighieri 44, WhatsApp 327, `#prenota` already present). It is **marble**, but **not** the exact Plus Jakarta page (`Felice Polese | Modern Barbering & Fade Studio`). That exact HTML was never in this git repo; the deleted `polesebarbershop` project (410) had hosted it.

## What we restored in git

Closest in-repo visual: commit `0da4547` (Plus Jakarta, `hero-media-cell`, white marble canvas), plus Google Fonts, `/video/` rewrites, booking wizard, Maps **Corso Dante 45**, WhatsApp **327 015 6225**. Document title: `Felice Polese | Modern Barbering & Fade Studio`. No scissors intro on the homepage.

## D1 — One public URL

**https://felicepolesebarbershop.vercel.app** on Vercel project **`temporary-prompt-quasar-rndxhgh`**.

Do not deploy current scissors `main` onto this project until the client agrees the marble look is back.

## D2 — Do not delete more Vercel projects

Do not recreate deleted `polesebarbershop`.

## D3 — Product copy on the restored look

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
