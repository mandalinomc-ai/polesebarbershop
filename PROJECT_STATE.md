# PROJECT_STATE — Felice Polese Barber Shop

**Updated:** 2026-09-02  
**Public URL to use:** https://felicepolesebarbershop.vercel.app  
**Vercel project to keep:** `temporary-prompt-quasar-rndxhgh`

## What the client wants

That marble site (the one that opens from the felice URL). Add **working booking**, keep/fix **Maps** and **WhatsApp**, delete the other Vercel projects.

## Current live (before this publish)

| URL | Now |
|-----|-----|
| felicepolesebarbershop.vercel.app | Marble look they like. WhatsApp **327** (wrong). Maps Dante **44**. **No** `/prenota`. |
| polesebarbershop.vercel.app | Same marble family + booking wizard + Maps 45 + WhatsApp **351**. Not the URL they want. |

## Repo (this branch)

- Default `NEXT_PUBLIC_SITE_URL` / `SITE.siteUrl` → `https://felicepolesebarbershop.vercel.app`
- Booking, Maps FAB, WhatsApp FAB already in code (351 + Dante 45)
- Publish script: `scripts/publish-felice-project.sh`

## After login + script

1. One production deploy onto `temporary-prompt-quasar-rndxhgh`
2. Delete `polesebarbershop` and `temporary-express-magnolia-5pa4zjj`
3. Copy Supabase/Resend env onto the remaining project so bookings persist

## Opening

2026-09-07 · Corso Dante 45 · +39 351 252 3087
