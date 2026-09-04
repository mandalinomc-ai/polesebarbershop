# DEPLOY_STATUS — emergency WhatsApp-only (2026-09-04)

**Branch:** `cursor/emergency-whatsapp-only-56a6`  
**Root cause:** Vercel `GMAIL_APP_PASSWORD` empty → Gmail SMTP auth fails; customer + salon booking emails never send.  
**Mitigation:** `BOOKING_EMAIL_DISABLED=true` in `lib/email.ts` — success flow uses WhatsApp (`wa.me/393270156225`) + `.ics` only.

---

# DEPLOY_STATUS — client UX polish

**Branch:** `cursor/client-ux-polish-56a6`  
**Tip:** `ac5749cadb17c2ca52af69ad98a296053fe37217`  
**PR:** https://github.com/mandalinomc-ai/polesebarbershop/pull/27  
**Target:** Vercel project `temporary-prompt-quasar-rndxhgh` → https://felicepolesebarbershop.vercel.app  
**Do not deploy to:** `polesebarbershop`

## Verdict (2026-09-04 ~08:25 UTC): **NO-GO for live UX polish**

Code is ready and pushed. **Cannot go live until Hobby deploy quota resets** — a new build is required.

| Item | Status |
|------|--------|
| Tip SHA on origin | `ac5749c` — pushed, PR #27 OPEN / MERGEABLE |
| Deployment of `ac5749c` | **NONE** (no READY/ERROR build for this SHA) |
| Alias-only path | **Impossible** — nothing to point at |
| Live domain alias | `dpl_58GJocqXEKBqiKwVkUU3ZCobCtk1` = **`0aa116c`** (preview-bug fix) |
| Project `targets.production` | still `3266fae` (WhatsApp FABs); alias was moved ahead without new tip |
| Official durations | **LIVE** via Supabase `/api/catalog` (Acconciatura 10, Tintura Capelli 30, Tintura Barba 20, Meches 150, Cutanea 180) |
| Local UX assertions | `lib/site-copy.test.ts` + `lib/site-pdf.test.ts` — **17/17 pass** |
| Prior suite | 224 passed (previous agent turn) |
| Vercel Git checks on PR | **FAILURE** both projects — `upgradeToPro=build-rate-limit` (08:19 UTC) |
| Extra CLI deploy this turn | **Not run** (quota already confirmed; do not spam) |

### Live vs tip (why alias cannot finish this)

| Marker | Live (`0aa116c`) | Tip (`ac5749c`) |
|--------|------------------|-----------------|
| Sidebar “nel wizard” | present | removed (Italian listino copy) |
| Footer Logo / Orari PDF | present | removed |
| `listino-box--selected` glow | absent in CSS | present |
| `scissors-photo-snip` | absent in CSS | present |
| section-title `clip-path` | still in CSS | removed (G bottoms) |
| `/cookie-policy` | 200 | 200 |
| Genio / scissors intro | present | present |

## Non-quota workarounds checked (all exhausted)

1. **Alias existing READY deploy** — newest usable is `0aa116c`; not this commit. Already aliased to production domain.
2. **Promote `targets.production`** — still older than tip; does not contain UX polish.
3. **`vercel deploy --prebuilt` / GitHub integration / CLI `--prod`** — all create a **new** deployment → still hit `api-deployments-free-per-day`.
4. **Rollback** — wrong direction; cannot invent `ac5749c` artifacts.
5. **Other Vercel projects** — forbidden; not attempted.

## GO when quota resets (single attempt)

```bash
# Project must stay temporary-prompt-quasar-rndxhgh only
npx vercel --prod --yes --force
# or: bash scripts/deploy-with-env-local.sh
```

After READY:

1. Confirm deployment meta SHA = tip (`ac5749c` or newer on same branch).
2. Ensure `felicepolesebarbershop.vercel.app` aliases to that deployment.
3. Smoke: no “nel wizard”; no Logo/Orari PDF footer; selected listino glow; scissors cut CSS; Durata prevista; `/api/catalog` durations; Genio; cookie-policy.

Timer armed: `client-ux-polish-quota-retry` (~16h, once) for one retry only.

## Historical notes (other branches)

Earlier 2026-09-04 quota blocks also affected security-ui-merge and production-ready-final on the same Hobby project. Same limiter; same project only.
