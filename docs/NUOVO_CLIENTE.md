# Nuovo cliente parrucchiere — kit white-label + Cursor

Usa **questa stessa codebase** (struttura, prenotazioni, gestionale, WhatsApp, deploy) come base.  
Per un nuovo salone cambi solo **dati + media + env**, non riscrivi le funzioni.

Riferimento live: `clients/felice-polese/`  
Template vuoto: `clients/_template/`  
Cliente attivo: `clients/active.ts`

---

## Flusso rapido (con Cursor)

1. **Crea il pack**
   ```bash
   node scripts/scaffold-client.mjs --slug nome-salone --name "Nome Salone" --activate
   ```
2. **Compila** `clients/<slug>/CLIENT_BRIEF.md` + `profile.ts`
3. **Carica** logo / foto / video in `public/assets/` (vedi `MEDIA_CHECKLIST.md`)
4. **Adatta** `lib/catalog.ts` (listino + orari seed + nome barbiere) e `lib/products.ts`
5. **Nuovo Supabase** + migrazioni `supabase/migrations/` + `.env` da `.env.example`
6. **Build / deploy** (VPS Docker o Vercel) con `NEXT_PUBLIC_SITE_URL` del cliente

### Prompt da incollare in Cursor

```text
Usa il kit white-label di questo repo (docs/NUOVO_CLIENTE.md).

Cliente attivo: clients/<slug>/
Ti allego: CLIENT_BRIEF compilato + foto/video.

Obiettivo: adattare il sito base (stesse funzioni di Felice Polese) a questo cliente.
- Completa clients/<slug>/profile.ts
- Aggiorna catalogo, prodotti, foto locale, video
- Sostituisci media in public/assets/
- Aggiorna site.webmanifest e testi legali con titolare/CF/P.IVA
- Non rompere prenotazione / gestionale / API admin
- Alla fine: checklist go-live (home, #prenota, gestionale, robots, HTTPS)
```

---

## Cosa è già “modello pronto”

| Funzione | Dove |
|----------|------|
| Landing + hero + sezioni | `components/site/*` |
| Listino duale + booking | `components/booking/*`, `/#prenota` |
| Gestionale | `/gestionale`, `components/gestionale/*` |
| API admin protette | `app/api/admin/*` |
| Orari runtime + pausa | `lib/runtime-shop-hours.ts`, tab Orari |
| WhatsApp / email / ICS | `lib/site-config.ts`, `lib/email.ts`, `lib/whatsapp-outbound.ts` |
| Privacy / cookie / terms | `app/*-policy`, `app/terms` |
| Deploy VPS | `scripts/vps-deploy.sh`, `deploy/` |

---

## Mappa file da personalizzare

| Priorità | File | Nota |
|----------|------|------|
| 1 | `clients/<slug>/profile.ts` | Brand, NAP, WA, SEO, copy, colori |
| 1 | `clients/active.ts` | Quale pack è attivo |
| 1 | `public/assets/images/logo*.png`, `og-cover.png` | Identità visiva |
| 2 | `lib/catalog.ts` | Servizi, prezzi, durate, `SHOP_HOURS`, barbieri |
| 2 | `lib/products.ts` | Prodotti vetrina |
| 2 | `lib/salon-photos.ts` | Sezione locale |
| 2 | `lib/site-videos.ts` | Reel / bio |
| 3 | `public/site.webmanifest` | Nome PWA |
| 3 | `app/privacy-policy`, `cookie-policy`, `terms` | Titolare |
| 3 | `.env` | Supabase **nuovo**, admin, Gmail, URL |

`lib/site-config.ts` legge già brand/copy dal pack attivo — non duplicare lì i dati cliente.

---

## Regole importanti

- **Un Supabase per cliente** — non condividere service role / DB.
- **Password admin unica** e forte per installazione.
- **Non** deployare un pack nuovo sul dominio Felice per sbaglio: controlla `clients/active.ts` e `NEXT_PUBLIC_SITE_URL`.
- Per tornare a Felice:  
  `node scripts/scaffold-client.mjs --slug felice-polese --activate`
- Export archivio pulito:  
  `node scripts/export-offline-backup.mjs --template`

---

## Go-live checklist

- [ ] Home: brand, hero, listino, contatti corretti
- [ ] `/#prenota`: slot + conferma + email/WhatsApp
- [ ] `/gestionale`: login, agenda, orari
- [ ] Foto/video nuovi (niente asset Felice residui se non voluti)
- [ ] `robots.txt` / `sitemap.xml` con URL cliente
- [ ] HTTPS ok
- [ ] Privacy/cookie con dati titolare aggiornati
