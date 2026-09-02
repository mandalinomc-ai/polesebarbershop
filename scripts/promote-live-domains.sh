#!/usr/bin/env bash
# Point the legacy hostname at the current polesebarbershop production site.
# Requires: npx vercel login  (or VERCEL_TOKEN)
set -euo pipefail

SOURCE="${1:-https://polesebarbershop.vercel.app}"
TARGET="${2:-felicepolesebarbershop.vercel.app}"

echo "→ $SOURCE  →  $TARGET"
npx vercel alias set "$SOURCE" "$TARGET"

echo ""
echo "Verify:"
echo "  curl -sL https://$TARGET | grep -o 'Felice Polese Barber Shop' | head -1"
echo "  curl -sI https://$TARGET/prenota | head -1"
