#!/usr/bin/env bash
# Deploy the NEW Polese Barbershop site to the production Vercel project.
# Requires: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID in the environment.
set -euo pipefail

cd "$(dirname "$0")/.."

: "${VERCEL_TOKEN:?Set VERCEL_TOKEN (https://vercel.com/account/tokens)}"
: "${VERCEL_ORG_ID:?Set VERCEL_ORG_ID (vercel whoami → id)}"
: "${VERCEL_PROJECT_ID:?Set VERCEL_PROJECT_ID (default: prj_E4dMpfR7ExzCAwNGH2MwO30jsqAf)}"

export VERCEL_ORG_ID VERCEL_PROJECT_ID

echo "→ Pulling Vercel production env…"
vercel pull --yes --environment=production --token="$VERCEL_TOKEN"

echo "→ Building…"
vercel build --prod --token="$VERCEL_TOKEN"

echo "→ Deploying to production (polesebarbershop.vercel.app)…"
vercel deploy --prebuilt --prod --token="$VERCEL_TOKEN"

echo "Done. Verify:"
echo "  https://polesebarbershop.vercel.app"
echo "  https://polesebarbershop.vercel.app/gestionale"
echo "  https://polesebarbershop.vercel.app/#prenota"
