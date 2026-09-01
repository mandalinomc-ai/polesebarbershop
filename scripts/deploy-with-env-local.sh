#!/usr/bin/env bash
# Production deploy with every var from .env.local baked into the deployment.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env.local ]]; then
  echo "Missing .env.local" >&2
  exit 1
fi

ENV_ARGS=()
while IFS='=' read -r key value; do
  [[ "$key" =~ ^#|^$ ]] && continue
  # Skip empty anon key placeholder
  [[ "$key" == "NEXT_PUBLIC_SUPABASE_ANON_KEY" && -z "$value" ]] && continue
  ENV_ARGS+=(-e "${key}=${value}")
  ENV_ARGS+=(-b "${key}=${value}")
done < .env.local

echo "→ Deploying with $((${#ENV_ARGS[@]} / 2)) env vars from .env.local…"
npx vercel deploy --temporary --prod --yes "${ENV_ARGS[@]}"
