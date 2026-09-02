# NEXT ACTION

**Updated:** 2026-09-02  
**Canonical URL (the one to use):** https://felicepolesebarbershop.vercel.app  
**Vercel project:** `temporary-prompt-quasar-rndxhgh`

## Goal

Same marble site the client likes, with **working booking**, Maps (Dante 45) and WhatsApp (**351 252 3087**, not the old 327). Then delete `polesebarbershop` and `temporary-express-magnolia-5pa4zjj`.

## After `npx vercel login`

```bash
./scripts/publish-felice-project.sh
```

That deploys this repo **once** onto the preferred project (the domain stays `felicepolesebarbershop.vercel.app`) and removes the other two projects.

## Verify

```bash
curl -sI https://felicepolesebarbershop.vercel.app/prenota
curl -sL https://felicepolesebarbershop.vercel.app | grep -o 'Felice Polese Barber Shop' | head -1
```

READY: `/prenota` HTTP 200, WhatsApp `wa.me/393512523087`, Maps Dante 45.
