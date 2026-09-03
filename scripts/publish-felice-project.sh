#!/usr/bin/env bash
# Publish current repo to the project that owns felicepolesebarbershop.vercel.app
# (temporary-prompt-quasar-rndxhgh) and remove the other Vercel projects.
# Requires: npx vercel login
set -euo pipefail
cd "$(dirname "$0")/.."

npx vercel whoami

TARGET_PROJECT="${VERCEL_TARGET_PROJECT:-temporary-prompt-quasar-rndxhgh}"
SITE_URL="https://felicepolesebarbershop.vercel.app"

echo "→ Link $TARGET_PROJECT"
npx vercel link --yes --project "$TARGET_PROJECT"

echo "→ Production env NEXT_PUBLIC_SITE_URL=$SITE_URL"
npx vercel env rm NEXT_PUBLIC_SITE_URL production --yes >/dev/null 2>&1 || true
printf '%s' "$SITE_URL" | npx vercel env add NEXT_PUBLIC_SITE_URL production

echo "→ Deploy production (this is the one deploy we need)"
npx vercel --prod --yes

echo "→ Remove leftover projects"
npx vercel project rm polesebarbershop --yes || true
npx vercel project rm temporary-express-magnolia-5pa4zjj --yes || true

echo ""
echo "Verify:"
echo "  curl -sI $SITE_URL/prenota"
echo "  curl -sL $SITE_URL | grep -o 'Felice Polese Barber Shop' | head -1"
