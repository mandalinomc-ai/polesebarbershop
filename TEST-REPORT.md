# Test Report — Felice Polese Barber Shop (gestionale-crm-final)

**Date:** 2026-09-02  
**Branch:** `cursor/gestionale-crm-final-6157`  
**Deploy:** NOT performed (awaiting joint test)

## DB cleanup (Phase 1)

| Action | Result |
|--------|--------|
| Deleted Eugenio Ciullo test booking | 1 row |
| Remaining appointments after cleanup | 0 |
| Verified empty calendar | OK |

Criteria: Eugenio Ciullo, Eugenio Test, Mario Rossi, @example.com, TEST notes — only Eugenio Ciullo was present; removed.

## Unit tests

```
npm test → 22 files, 119 tests — ALL PASS
```

## Production build

```
npm run build → SUCCESS
```

## API tests (live Supabase + dev server)

| Test | Result |
|------|--------|
| POST booking create | 200, persisted=true |
| Auto WhatsApp disabled | customerWhatsAppSent=false, salonWhatsAppSent=false |
| Overlap same barber/time | 409 "orario non più disponibile" |
| Cross-barber same time | 200 OK (Felice + Davide) |
| Grey/taken slots (availability) | 11 occupied slots shown for test day |
| 9 bookable services (catalog) | Verified in lib/catalog.ts |

Admin gestionale routes: covered by unit tests (`admin-auth.test.ts`, static CRM checks). Live admin cookie test blocked by stale dev `.next` cache after build — use fresh `npm run dev` for joint test.

## Gestionale features

| Feature | Status |
|---------|--------|
| Dashboard (today, upcoming, revenue, confirmed/cancelled, new/returning) | Done |
| Calendar day + week view, Felice/Davide columns | Done |
| Confirm / move / cancel (status cancelled, not delete) | Done |
| CRM clienti with stats, history, editable notes | Done (notes need migration) |
| Statistiche with filters + charts | Done |
| Storico permanente (ANNULLATA) | Done |
| WhatsApp button → wa.me only | Done |
| Auto WhatsApp API removed from booking | Done |

## Pending / manual

1. **Run SQL migration** in Supabase SQL Editor: `supabase/migrations/005_customer_notes.sql` (client notes in CRM).
2. **Email:** Resend key in `.env.local` works; optional Gmail app password only if switching from Resend to SMTP (not required for go-live if Resend is configured on Vercel).

## Public site

- Bio video path: `/video/video-felice-polese-bio.mp4` (configured; mp4 files not in git — sync via `scripts/sync-videos.ps1`).
- 9 services listino, techniques not bookable — verified by tests.
- Marble layout hierarchy preserved.
