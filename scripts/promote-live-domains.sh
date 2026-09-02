#!/usr/bin/env bash
# Promote the latest Git production deployment to the public Vercel domains.
# Requires: npx vercel login  (or VERCEL_TOKEN)
set -euo pipefail

DEPLOY_URL="${1:-https://polesebarbershop-at512kktm-mandalinomc-8144s-projects.vercel.app}"

echo "→ Aliasing $DEPLOY_URL"
npx vercel alias set "$DEPLOY_URL" polesebarbershop.vercel.app
npx vercel alias set "$DEPLOY_URL" felicepolesebarbershop.vercel.app

echo ""
echo "Verify:"
echo "  curl -sL https://felicepolesebarbershop.vercel.app | grep -o 'Felice Polese Barber Shop' | head -1"
echo "  curl -sI https://felicepolesebarbershop.vercel.app/prenota"
