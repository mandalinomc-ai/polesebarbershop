#!/usr/bin/env bash
# Deploy / aggiorna il sito sul VPS senza spezzare HTTPS.
# Uso (sul server, da /var/www/felice-polese):
#   bash scripts/vps-deploy.sh [branch]
set -euo pipefail

BRANCH="${1:-cursor/orari-pausa-pranzo-56a6}"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

echo "==> Fetch $BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

# Se i certificati Let's Encrypt esistono, monta sempre la config HTTPS.
# (git reset ripristina nginx.active.conf al bootstrap HTTP — qui lo correggiamo.)
if [[ -f deploy/certbot/conf/live/felicepolesebarbershop.it/fullchain.pem ]]; then
  echo "==> Ripristino nginx HTTPS"
  cp deploy/nginx.conf deploy/nginx.active.conf
else
  echo "==> Nessun certificato: lascio bootstrap HTTP"
  cp deploy/nginx.http-bootstrap.conf deploy/nginx.active.conf
fi

echo "==> Build & up"
docker compose up -d --build --force-recreate app
docker compose up -d nginx certbot
docker compose exec -T nginx nginx -t
docker compose exec -T nginx nginx -s reload || docker compose restart nginx

echo "==> Stato"
docker compose ps
curl -sS -o /dev/null -w "local_https %{http_code}\n" -k https://127.0.0.1/gestionale \
  -H 'Host: felicepolesebarbershop.it' || true
echo "OK — apri https://felicepolesebarbershop.it/gestionale?tab=orari"
