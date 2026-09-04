# COMPLIANCE_AUDIT — Felice Polese Barber Shop

**Site:** https://felicepolesebarbershop.vercel.app  
**Date:** 2026-09-04  

> This document is an internal checklist. It does **not** claim “100% GDPR compliant”.

## Privacy UX

| Item | Status |
|------|--------|
| Privacy policy page (`/privacy-policy`) | Updated with real services only |
| Cookie policy (`/cookie-policy`) | Present |
| Cookie banner Accetta / Rifiuta / Personalizza | Present, non-blocking |
| Footer «Gestisci cookie» | Present |
| Booking GDPR checkbox (required) | Present + server Zod |
| No invented legal entity fields | CF / P.IVA from `SITE` config only; gaps in LEGAL_TODO |

## Cookies actually used

1. `polese_admin` — necessary, HttpOnly gestionale session  
2. `polese_cookie_consent` — preferences (only if user accepts preferences)

No GA / Meta Pixel / Hotjar.

## Lawful bases (summary)

- Booking personal data: contract / pre-contract (art. 6.1.b)  
- Abuse prevention (rate limits): legitimate interest (art. 6.1.f)  
- Preference cookie: consent  

## Third parties

See `THIRD_PARTY_SERVICES.md` (Vercel, Supabase, Gmail SMTP, Google Maps, Google Fonts).

## Open compliance work

See `LEGAL_TODO.md` (DPO, DPIA, RoPA, Google Fonts self-host option, DPA signatures).
