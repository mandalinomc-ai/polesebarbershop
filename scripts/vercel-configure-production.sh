#!/usr/bin/env bash
# Configure Vercel production env vars and redeploy.
# Usage: VERCEL_TOKEN=xxx VERCEL_ORG_ID=xxx ./scripts/vercel-configure-production.sh [SITE_URL]
set -euo pipefail

cd "$(dirname "$0")/.."

: "${VERCEL_TOKEN:?Set VERCEL_TOKEN from https://vercel.com/account/tokens}"
: "${VERCEL_ORG_ID:?Set VERCEL_ORG_ID (vercel whoami → id, or Project Settings → General)}"
VERCEL_PROJECT_ID="${VERCEL_PROJECT_ID:-prj_E4dMpfR7ExzCAwNGH2MwO30jsqAf}"
SITE_URL="${1:-https://felicepolesebarbershop.vercel.app}"

if [[ -f .env.local ]]; then
  set -a
  while IFS='=' read -r key value; do
    [[ "$key" =~ ^#|^$ ]] && continue
    case "$key" in
      SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|RESEND_API_KEY|ADMIN_PASSWORD|ADMIN_EMAIL|OWNER_EMAIL|NOTIFY_EMAIL|ADMIN_USER|NEXT_PUBLIC_SUPABASE_URL)
        export "$key=$value"
        ;;
      RESEND_FROM)
        export RESEND_FROM="$value"
        ;;
    esac
  done < <(grep -E '^(SUPABASE_|RESEND_|ADMIN_|OWNER_|NEXT_PUBLIC_SUPABASE)' .env.local || true)
  set +a
fi

: "${SUPABASE_URL:?Set SUPABASE_URL in .env.local or environment}"
: "${SUPABASE_SERVICE_ROLE_KEY:?Set SUPABASE_SERVICE_ROLE_KEY}"
: "${RESEND_API_KEY:?Set RESEND_API_KEY}"
: "${ADMIN_PASSWORD:?Set ADMIN_PASSWORD}"

RESEND_FROM="${RESEND_FROM:-Polese Barbershop <onboarding@resend.dev>}"
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_EMAIL="${ADMIN_EMAIL:-felicepolese550@gmail.com}"
OWNER_EMAIL="${OWNER_EMAIL:-felicepolese550@gmail.com}"
NOTIFY_EMAIL="${NOTIFY_EMAIL:-}"
NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-$SUPABASE_URL}"

API="https://api.vercel.com"
AUTH=(-H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json")

upsert_env() {
  local key="$1" value="$2" type="${3:-encrypted}"
  local payload
  payload=$(python3 -c 'import json,sys; print(json.dumps({"key":sys.argv[1],"value":sys.argv[2],"type":sys.argv[3],"target":["production","preview","development"]}))' "$key" "$value" "$type")
  curl -sf "${AUTH[@]}" -X POST \
    "$API/v10/projects/$VERCEL_PROJECT_ID/env?upsert=true" \
    -d "$payload" >/dev/null
  echo "  ✓ $key"
}

echo "→ Setting env vars on $VERCEL_PROJECT_ID (Production)…"
upsert_env NEXT_PUBLIC_SITE_URL "$SITE_URL" plain
upsert_env NEXT_PUBLIC_IS_COMING_SOON "false" plain
upsert_env NEXT_PUBLIC_SUPABASE_URL "$NEXT_PUBLIC_SUPABASE_URL" plain
upsert_env SUPABASE_URL "$SUPABASE_URL"
upsert_env SUPABASE_SERVICE_ROLE_KEY "$SUPABASE_SERVICE_ROLE_KEY"
upsert_env RESEND_API_KEY "$RESEND_API_KEY"
upsert_env RESEND_FROM "$RESEND_FROM"
upsert_env ADMIN_USER "$ADMIN_USER" plain
upsert_env ADMIN_PASSWORD "$ADMIN_PASSWORD"
upsert_env ADMIN_EMAIL "$ADMIN_EMAIL" plain
upsert_env OWNER_EMAIL "$OWNER_EMAIL" plain
if [[ -n "$NOTIFY_EMAIL" ]]; then
  upsert_env NOTIFY_EMAIL "$NOTIFY_EMAIL" plain
fi

echo "→ Triggering production redeploy…"
export VERCEL_ORG_ID VERCEL_PROJECT_ID
npx vercel pull --yes --environment=production --token="$VERCEL_TOKEN"
npx vercel build --prod --token="$VERCEL_TOKEN"
DEPLOY_URL=$(npx vercel deploy --prebuilt --prod --token="$VERCEL_TOKEN" 2>&1 | tail -1)
echo "→ Deployed: $DEPLOY_URL"

echo ""
echo "Verify:"
echo "  curl \"$SITE_URL/api/availability?date=2026-09-02&barberId=anyone&serviceIds=taglio-standard\""
echo "  (no 'database non configurato' in response)"
echo "  $SITE_URL/gestionale  (admin / $ADMIN_USER)"
