# Pack template — nuovo parrucchiere / barbiere

Questa cartella è il **modello dati** del sito Felice Polese (stessa struttura e funzioni).

## Cosa include il sito base (già pronto)

- Landing + hero video + listino duale + mini-cart
- Prenotazione online `/#prenota` + gestione `/appuntamento/[token]`
- Gestionale `/gestionale` (agenda, clienti, orari, team, walk-in)
- WhatsApp / email / ICS, privacy / cookie / terms
- Deploy Docker/VPS o Vercel

## Cosa personalizzi per il cliente

| File / area | Contenuto |
|-------------|-----------|
| `clients/<slug>/profile.ts` | Brand, NAP, WA, email, SEO, copy hero, colori |
| `lib/catalog.ts` | Servizi, prezzi, durate, orari seed, barbieri |
| `lib/products.ts` | Prodotti vetrina |
| `lib/salon-photos.ts` | Foto sezione locale |
| `lib/site-videos.ts` | Reel / bio / tour |
| `public/assets/**` | Logo, foto, video, OG, QR |
| `.env` da `.env.example` | Supabase, admin, Gmail, `NEXT_PUBLIC_SITE_URL` |
| `public/site.webmanifest` | Nome PWA |
| `app/privacy-policy` ecc. | Titolare / CF / P.IVA |

## Comandi

```bash
# Crea pack vuoto + (opzionale) attiva
node scripts/scaffold-client.mjs --slug mario-fade --name "Mario Fade Studio" --activate

# Torna a Felice
node scripts/scaffold-client.mjs --slug felice-polese --activate
```

Guida Cursor completa: `docs/NUOVO_CLIENTE.md`.
