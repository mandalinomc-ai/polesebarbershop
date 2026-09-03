# NEXT ACTION

**Updated:** 2026-09-03  
**USA QUESTO:** https://felicepolesebarbershop.vercel.app  
**Vercel:** `temporary-prompt-quasar-rndxhgh` (NOT polesebarbershop)

## Fatto oggi

1. `GMAIL_APP_PASSWORD` presente su **Production** (insieme a `GMAIL_USER` / `BOOKING_NOTIFICATION_EMAIL`)
2. Redeploy production forzato → nuovo env caricato
3. Test prenotazione live verso **solo** `felicepolese550@gmail.com` → `persisted` + `emailSent` + `ownerNotified` OK
4. Site healthy: homepage 200, Maps Dante 44, prezzi, video

## Prossimo passo (utente)

1. **Review:** controlla inbox Gmail (`felicepolese550@gmail.com`) — conferma cliente + avviso salone del test Taglio Pro 9 set 08:30
2. Se vuoi, cancella l’appuntamento di test da `/gestionale`
3. **Più avanti:** cleanup progetti Vercel inutilizzati / duplicati (es. polesebarbershop) quando confermi che Felice vive solo su questo progetto

## Non fare

- Non toccare `polesebarbershop` come target di deploy
- Non stampare / condividere `GMAIL_APP_PASSWORD`
