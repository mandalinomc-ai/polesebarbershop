# NEXT ACTION

**Updated:** 2026-09-04  
**USA QUESTO:** https://felicepolesebarbershop.vercel.app  
**Vercel:** `temporary-prompt-quasar-rndxhgh` (NOT polesebarbershop)

## Fatto (2026-09-04)

1. **Migration 007 applied** on production Supabase — `appointments.duration_override_min`
2. Column + check constraint verified; override insert/update/delete path OK (test row deleted)
3. Live `/api/availability` returns smart slots (Taglio Pro 50 min; blockEnd includes +5 buffer)
4. Taglio Pro live + DB: **25 € / 50 min**
5. Site health: homepage/prenota/gestionale 200 — redeploy not needed (DB-only)

## Prossimo passo (utente)

1. Opzionale: prova override durata da `/gestionale` (walk-in / modifica)
2. **Più avanti:** cleanup progetti Vercel inutilizzati / duplicati (es. polesebarbershop) quando confermi che Felice vive solo su questo progetto

## Non fare

- Non toccare `polesebarbershop` come target di deploy
- Non stampare / condividere secret (service role, DB password, Gmail app password)
