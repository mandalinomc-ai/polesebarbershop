# NEXT ACTION

**Updated:** 2026-09-01  
**Blocker:** Cloud Vercel CLI is logged out; device OAuth was not completed by a human.

## Single next step

**On your local PC** (in the repo clone), run these 4 commands to deploy and reassign the legacy domain:

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
curl -s https://felicepolesebarbershop.vercel.app | grep -o 'Felice Polese Barber Shop' | head -1
curl -s https://polesebarbershop.vercel.app | grep -o 'Felice Polese Barber Shop' | head -1
```

Both should return `Felice Polese Barber Shop`.

## Optional: fix GitHub auto-deploy

Add these secrets in GitHub → Settings → Secrets → Actions:

| Secret | Value |
|--------|-------|
| `VERCEL_TOKEN` | Token from https://vercel.com/account/tokens |
| `VERCEL_ORG_ID` | From `vercel whoami` or Project Settings → General |
| `VERCEL_PROJECT_ID` | `prj_E4dMpfR7ExzCAwNGH2MwO30jsqAf` |

Then re-run the failed workflow or push a no-op commit to `main`.

## Alternative (cloud)

If you prefer to auth in cloud: visit the device URL when `npx vercel login` prints it, approve, then re-run the agent. Device URL from last attempt (expired): `https://vercel.com/oauth/device?user_code=HGGF-GJCF` — run `npx vercel login` again for a fresh code.
