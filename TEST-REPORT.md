# Test Report — Felice Polese Barber Shop (gestionale-crm-final)

**Date:** 2026-09-02  
**Branch:** `cursor/gestionale-crm-final-6157`  
**Deploy:** NOT performed (`vercel --prod` not run)

---

## Task 1 — Migration `005_customer_notes.sql`

| Check | Result |
|-------|--------|
| Table `public.customer_notes` exists | **FAIL** — `PGRST205` (not in schema cache) |
| Attempted via REST / service role | DDL not supported |
| Attempted via `psql` / direct host | IPv6-only DB host; VM has no IPv6 route |
| Pooler region identified | `aws-0-eu-west-2.pooler.supabase.com` (IPv4 OK) |
| Pooler auth | Needs **Database password** (not `SUPABASE_SERVICE_ROLE_KEY`) |

**Action required (one-time, ~30 sec):**

1. Supabase Dashboard → SQL Editor → New query  
2. Paste contents of `supabase/migrations/005_customer_notes.sql`  
3. Run  

Or from repo root (after copying DB password from Dashboard → Settings → Database):

```powershell
$env:SUPABASE_DB_PASSWORD = "your-database-password"
node scripts/run-migration-005.mjs
```

---

## Task 2 — Joint test Eugenio Ciullo

**Target:** `http://localhost:3001` (dev server, `.env.local`)  
**Cliente:** Eugenio Ciullo · 3483470654 · eugeniociullo96@gmail.com

| Step | Result | Detail |
|------|--------|--------|
| POST `/api/bookings` | **PASS** | `persisted=true`, id `95630f7c-f017-4ce9-a9c5-fb5ec9e972a3` |
| No auto WhatsApp on booking | **PASS** | `customerWhatsAppSent=false`, `salonWhatsAppSent=false` |
| Admin login (`admin` / env) | **PASS** | Cookie session OK |
| CRM anagrafica | **PASS** | Eugenio Ciullo, `clientKey=p:393483470654`, visits=1 |
| Dashboard stats | **PASS** | `totalClients=1`, `upcomingCount=1` |
| Calendar day view | **PASS** | Appuntamento visibile (poi spostato) |
| WhatsApp → wa.me cliente | **PASS** | `https://wa.me/393483470654?text=…` (non 327) |
| Move appointment | **PASS** | → 2026-09-10 11:00, barber **Davide** |
| Cancel appointment | **PASS** | `status=cancelled` (non eliminato) |
| Storico ANNULLATA | **PASS** | Label **ANNULLATA**, data 2026-09-10 |
| CRM notes save | **FAIL** | Tabella `customer_notes` mancante (migration pending) |

**Nota:** la prenotazione Eugenio resta in DB come **ANNULLATA** nello storico (id sopra) — verificabile in `/gestionale` → Storico. Non è stata cancellata dal database.

---

## Task 3 — Video paths (Windows)

Vedi risposta agent / `docs/VIDEO-SYNC.md`. Sync: `.\scripts\sync-videos.ps1` dalla root repo, poi `git add public/assets/video`, commit, push.

---

## Unit / build (unchanged)

```
npm test  → 22 files, 119 tests — ALL PASS
npm run build → SUCCESS
```
