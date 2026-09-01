# NEXT ACTION

**Updated:** 2026-09-01 (final deploy attempt — commit `559fb41`)  
**Blocker:** **BLOCCO: Vercel CLI non autenticata nell'ambiente dell'agente.**

`npx vercel whoami` → **Logged out**. Deploy and alias were **not** executed.

## Manual action required (local PC)

```bash
cd /path/to/polesebarbershop
npx vercel login
npx vercel link --yes --project polesebarbershop
npx vercel --prod
npx vercel alias set <deploy-url-from-previous-command> felicepolesebarbershop.vercel.app
```

Replace `<deploy-url-from-previous-command>` with the production URL printed by `npx vercel --prod` (e.g. `polesebarbershop-xxxxx.vercel.app`).

## Verify after alias

```bash
curl -s https://felicepolesebarbershop.vercel.app | grep -E 'Felice Polese Barber Shop|Modern Barbering|Polese Barbershop'
```

**READY** only when output includes `Felice Polese Barber Shop` (not `Polese Barbershop`).

Current state (2026-09-01): `felicepolesebarbershop.vercel.app` still shows **Polese Barbershop** (stale). `polesebarbershop.vercel.app` shows **Felice Polese Barber Shop** (correct).

## Optional: fix GitHub auto-deploy

Add these secrets in GitHub → Settings → Secrets → Actions:

| Secret | Value |
|--------|-------|
| `VERCEL_TOKEN` | Token from https://vercel.com/account/tokens |
| `VERCEL_ORG_ID` | From `vercel whoami` or Project Settings → General |
| `VERCEL_PROJECT_ID` | `prj_E4dMpfR7ExzCAwNGH2MwO30jsqAf` |

Then re-run the failed workflow or push a no-op commit to `main`.

## Alternative (cloud)

Re-run the agent after completing `npx vercel login` in this environment (device OAuth at `https://vercel.com/oauth/device`), or inject `VERCEL_TOKEN` into the cloud environment.
