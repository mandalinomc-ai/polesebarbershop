# NEXT ACTION

**Updated:** 2026-09-02  
**Canonical live:** https://polesebarbershop.vercel.app — **READY**

## Done

`github.autoAlias: true` + push to `main` assigned production domains on the **polesebarbershop** project.

Verified in browser:

- Intro forbici → sito
- **Felice Polese Barber Shop** / **MODERN BARBERING & FADE STUDIO**
- **Corso Dante 45**
- Countdown apertura 7 settembre + prenotazioni già aperte
- Wizard Fresha su `/#prenota` (servizio → barbiere → data)
- Video `felice-working.mp4` e reels: HTTP 200

## Still open

### 1. `felicepolesebarbershop.vercel.app` (legacy project)

Still the **old** site (Dante 44, no `/prenota`). That hostname is on a separate Vercel project.

After `npx vercel login`:

```bash
./scripts/promote-live-domains.sh
# or:
npx vercel alias set https://polesebarbershop.vercel.app felicepolesebarbershop.vercel.app
```

### 2. Supabase env on the polesebarbershop project

Booking calendar warning: *«database non configurato»*. Slots show in local mode; real persist needs `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (and Resend keys) on the **polesebarbershop** Vercel project. Use `.env.local` + `./scripts/vercel-configure-production.sh` when `VERCEL_TOKEN` is available.

## READY check (canonical)

```bash
curl -sL https://polesebarbershop.vercel.app | grep -o 'Felice Polese Barber Shop' | head -1
curl -sI https://polesebarbershop.vercel.app/prenota | head -1
```

Pass: `Felice Polese Barber Shop` + `/prenota` HTTP 200.
