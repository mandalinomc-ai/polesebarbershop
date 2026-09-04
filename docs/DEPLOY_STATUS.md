# DEPLOY_STATUS — security-compliance branch

**Branch:** `cursor/security-compliance-56a6`  
**Target:** Vercel project `temporary-prompt-quasar-rndxhgh` → https://felicepolesebarbershop.vercel.app  
**Do not deploy to:** `polesebarbershop`

## Local verification (green)

- `npx tsc --noEmit` — pass
- `npm test` — 197/197 pass
- `npm run build` — pass (includes `/cookie-policy`, middleware)
- `npm audit --omit=dev` — postcss via Next 15 (known; force-fix → Next 16 breaking)

## Deploy attempt (2026-09-04)

```
Resource is limited - try again in 24 hours
(code: api-deployments-free-per-day)
```

Hobby plan daily deployment quota exhausted. Code is committed and pushed; redeploy when quota resets:

```bash
bash scripts/deploy-with-env-local.sh
# or: npx vercel deploy --prod --yes
```

Confirm after deploy: `/`, `/prenota`, `/cookie-policy`, `/privacy-policy`, `/gestionale`, cookie banner Accetta/Rifiuta/Personalizza.
