# DECISIONS — Felice Polese infrastructure

**Updated:** 2026-09-02 (client: use felice domain only)

## D1 — The site to use is `felicepolesebarbershop.vercel.app`

**Decision:** Public URL is **https://felicepolesebarbershop.vercel.app** on Vercel project **`temporary-prompt-quasar-rndxhgh`**.

That project already has the marble look the client wants. We deploy **this repo** (booking + Maps Dante 45 + WhatsApp 351) onto that project — one production deploy — then delete the other Vercel projects.

Do **not** keep using `polesebarbershop.vercel.app` as the public URL.

## D2 — Delete leftover Vercel projects after the felice deploy

- `polesebarbershop` (Git-connected duplicate)
- `temporary-express-magnolia-5pa4zjj` (junk)

Script: `./scripts/publish-felice-project.sh` (needs `npx vercel login`).

## D3 — WhatsApp and Maps on that site

Live felice URL currently has an old WhatsApp number and Maps to Dante 44. Repo source of truth:

- WhatsApp: **+39 351 252 3087**
- Maps: **Corso Dante 45**

FABs already exist in `Chrome.tsx`. They go live on felice when this repo is deployed there.

## D4 — Booking

Fresha wizard is already in the repo (`/#prenota` and `/prenota`). The felice URL 404s `/prenota` until this deploy. Real persist still needs Supabase env on **that** Vercel project.

## D5 — Cloud CLI

Deploy/delete of Vercel projects requires `npx vercel login` in this environment. Device OAuth cannot be completed by the agent alone.
