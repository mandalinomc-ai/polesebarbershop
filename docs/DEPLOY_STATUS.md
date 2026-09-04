# DEPLOY_STATUS — security + UI merge

**Branch:** `cursor/security-ui-merge-deploy-854b`  
(merge of `cursor/security-compliance-56a6` + `cursor/ui-fx-polish-deploy-490f`)  
**Target:** Vercel project `temporary-prompt-quasar-rndxhgh` → https://felicepolesebarbershop.vercel.app  
**Do not deploy to:** `polesebarbershop`

## Merge (done)

- UI tip brought in: Genio footer, scissors intro, polish/motion
- Security kept: CookieBanner, `/cookie-policy`, hardened gestionale/booking, CSP middleware
- Conflict resolved in `components/site/Chrome.tsx` (both Genio + CookieBanner)

## Local verification (green)

- `npm test` — 197/197 pass
- `npm run build` — pass (routes include `/cookie-policy`, `/privacy-policy`, `/gestionale`)

## Deploy attempt (2026-09-04 ~01:34 UTC)

```
npx vercel --prod --yes --force
→ Project: temporary-prompt-quasar-rndxhgh (correct)
→ Error: Resource is limited - try again in 24 hours
  (code: api-deployments-free-per-day)
```

Hobby daily deployment quota still exhausted (many prod/preview deploys in the last ~2h on this project).  
Code is committed + pushed; **live site not updated** with cookie compliance yet.

### Live snapshot at fail time

| Check | Status |
|-------|--------|
| `/` Genio Digital | present |
| `/` ScissorsIntro | present |
| `/cookie-policy` | **404** (compliance not live) |
| `/privacy-policy` | 200 |
| `/gestionale` | 200 |
| Cookie banner | not live |

Redeploy when quota resets:

```bash
npx vercel --prod --yes --force
# or: bash scripts/deploy-with-env-local.sh
```

Confirm after deploy: `/`, `/prenota`, `/cookie-policy`, `/privacy-policy`, `/gestionale`, cookie banner Accetta/Rifiuta/Personalizza, Genio footer, scissors intro.
## 2026-09-04 — production-ready-final
- Branch: cursor/production-ready-final-56a6
- Tests: 209 passed; next build OK
- Deploy: BLOCKED api-deployments-free-per-day (quota)
- Target: temporary-prompt-quasar-rndxhgh → felicepolesebarbershop.vercel.app
- NOT polesebarbershop

