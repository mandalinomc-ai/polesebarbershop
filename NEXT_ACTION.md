# NEXT ACTION

**Updated:** 2026-09-25  
**Produzione (unico target):** https://felicepolesebarbershop.it — VPS `94.177.161.26`  
**Vercel:** dismesso per produzione (workflow GitHub disabilitato).

## Step email/WhatsApp (slow-mode)

1. ✅ SMTP Aruba + Reply-To  
2. ✅ Template email cancellazione staff  
3. 🔄 Sanitizzazione WhatsApp (+39) + pulizia Vercel  
4. ⏸ Test finale E2E — in attesa conferma utente

## Deploy VPS

```bash
cd /var/www/felice-polese
git pull --ff-only origin main   # o branch Step 3
docker compose down && docker compose up -d --build
```
