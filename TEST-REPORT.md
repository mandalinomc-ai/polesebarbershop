# Test Report — Felice Polese Barber Shop (final-ready)

**Date:** 2026-09-02  
**Branch:** `cursor/final-ready-6157`  
**Deploy:** NOT performed (`vercel --prod` not run)

---

## Summary

| Area | Result |
|------|--------|
| Unit tests | **121/121 PASS** |
| Build | **SUCCESS** |
| E2E (`scripts/e2e-final-test.mjs`) | **13/13 PASS** |
| Test data cleanup | **YES** — DB appointments empty |
| CRM notes | **PASS** via storage fallback (`crm-data` bucket) |
| Migration `005_customer_notes.sql` | **NOT applied** (no DB password) |

---

## 1 — Supabase / CRM notes

| Method | Result |
|--------|--------|
| REST DDL via service role | Not supported |
| Direct host `db.*.supabase.co` | IPv6-only from VM |
| Pooler `aws-0-eu-west-2.pooler.supabase.com` | Needs **Database password** (not service role) |
| `scripts/run-migration-005.mjs` | Blocked without `SUPABASE_DB_PASSWORD` |
| **Storage fallback** (`lib/crm-notes-store.ts`) | **WORKS** — private bucket `crm-data/customer-notes.json` |

**Verified:** PATCH `/api/admin/crm` saves note → GET reloads same `crmNotes` (`notesSource=storage`).

**Optional one-time SQL** (when DB password available): run `supabase/migrations/005_customer_notes.sql` in Supabase SQL Editor.

---

## 2 — Email (Resend)

**Config:** `RESEND_API_KEY` + `RESEND_FROM=onboarding@resend.dev` (test mode)

| Recipient | Result |
|-----------|--------|
| `mandalinomc@gmail.com` (NOTIFY_EMAIL / Resend account) | **SENT** — id `01a06356-6842-735f-ad91-adb496c00ac7` |
| `felicepolese550@gmail.com` (ADMIN_EMAIL / salon) | **BLOCKED** — Resend test mode: only account owner inbox |
| Arbitrary customer email on booking | **BLOCKED** in test mode unless recipient is `mandalinomc@gmail.com` |

**Truth:** Automatic email to **Felice** and to **real customers** requires verified domain on Resend (or Gmail app password / Mailgun in env). Booking flow returns `emailSent=false` with user-friendly WhatsApp fallback message when blocked.

---

## 3 — WhatsApp

| Check | Result |
|-------|--------|
| `WHATSAPP_TOKEN` / Sinch env | **Not set** |
| Automatic API on booking | **NO** — `customerWhatsAppSent=false`, `salonWhatsAppSent=false` (honest flags) |
| Gestionale manual | **wa.me** links to client number and salon `+393270156225` |

**Truth:** No automatic WhatsApp without Meta Business / Sinch Conversation API credentials. Gestionale uses wa.me for manual send.

---

## 4 — Videos (repo)

**In git (`public/assets/video/`):**

- `taglio-01.mp4`, `taglio-02.mp4`, `taglio-03.mp4`
- `colorazione-01.mp4`, `colorazione-02.mp4`, `colorazione-03.mp4`
- `salone-generale.mp4`

**Not in repo yet** (wired in code + `scripts/sync-videos.ps1` mapping):

- `video-felice-polese-bio.mp4` ← `video felice polese bio.mp4`
- `razor-fade.mp4`, `taper-fade.mp4`, `burst-fade.mp4`

**Code:** `/video/*` rewrites to `/assets/video/*`. Bio section and technique gallery render **only when file exists on disk**. No references to `felice-working.mp4`.

---

## 5 — E2E results (`http://localhost:3003`)

| Test | Result |
|------|--------|
| Booking create | PASS |
| Overlap 409 | PASS |
| Cross-barber same slot | PASS |
| Gestionale login | PASS |
| CRM load + stats | PASS |
| Notes save/reload | PASS (storage) |
| Move appointment | PASS |
| Cancel + storico ANNULLATA | PASS |
| WhatsApp API | PASS (wa.me only, expected) |
| Email to NOTIFY_EMAIL | PASS |
| Email to Felice | PASS (correctly blocked in test mode) |

---

## 6 — Test data cleanup

Deleted:

- Eugenio Ciullo booking (`eugeniociullo96@gmail.com`, cancelled)
- E2E test bookings (`test@*`, `test-finale-*`)

**Verified:** `appointments` table count = **0**.

---

## 7 — Mobile UX

`FreshaBookingFlow`: existing 44px tap targets, 16px inputs, stacked footer on ≤720px. Added minor padding/wrap tweaks for booking head on small screens.

---

## Commands

```bash
npm test
npm run build
node scripts/e2e-final-test.mjs http://localhost:3003
node scripts/cleanup-test-data.mjs
```
