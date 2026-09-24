#!/usr/bin/env bash
# =============================================================================
# Bootstrap VPS Ubuntu (Aruba Cloud) — Felice Polese Barber Shop
# Dominio: felicepolesebarbershop.it + www
#
# Uso (da root del repo sul server, come root):
#   sudo bash scripts/vps-bootstrap.sh
#
# Prerequisiti:
#   - DNS A di felicepolesebarbershop.it e www → IP di questo VPS
#   - .env.production compilato dallo STESSO progetto Supabase attuale
# =============================================================================
set -euo pipefail

DOMAIN="felicepolesebarbershop.it"
WWW_DOMAIN="www.felicepolesebarbershop.it"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SWAP_SIZE_MB=2048

cd "$REPO_DIR"

echo "==> [1/7] Aggiornamento pacchetti"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

echo "==> [2/7] SWAP 2 GB (se assente)"
if ! swapon --show | grep -q .; then
  if [[ ! -f /swapfile ]]; then
    fallocate -l "${SWAP_SIZE_MB}M" /swapfile || dd if=/dev/zero of=/swapfile bs=1M count="${SWAP_SIZE_MB}"
    chmod 600 /swapfile
    mkswap /swapfile
  fi
  swapon /swapfile || true
  if ! grep -q '/swapfile' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
else
  echo "    SWAP già attiva — skip"
fi

echo "==> [3/7] Docker + Compose plugin"
if ! command -v docker >/dev/null 2>&1; then
  apt-get install -y ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  if [[ ! -f /etc/apt/keyrings/docker.gpg ]]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
  fi
  # shellcheck disable=SC1091
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
  echo "    Docker già installato — skip"
fi

systemctl enable --now docker

echo "==> [4/7] Verifica .env.production"
if [[ ! -f .env.production ]]; then
  echo "ERRORE: manca .env.production"
  echo "cp .env.production.example .env.production  # poi compila i valori"
  exit 1
fi

CERTBOT_EMAIL="$(grep -E '^CERTBOT_EMAIL=' .env.production | cut -d= -f2- | tr -d '"' || true)"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-felicepolese550@gmail.com}"

SUPABASE_CHECK="$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' .env.production | cut -d= -f2- | tr -d '"' || true)"
if [[ -z "$SUPABASE_CHECK" || "$SUPABASE_CHECK" == *"YOUR_PROJECT_REF"* ]]; then
  echo "ERRORE: NEXT_PUBLIC_SUPABASE_URL non configurato in .env.production"
  exit 1
fi
echo "    Supabase URL (verifica): $SUPABASE_CHECK"

mkdir -p deploy/certbot/conf deploy/certbot/www
# Partenza HTTP (ACME)
cp -f deploy/nginx.http-bootstrap.conf deploy/nginx.active.conf

echo "==> [5/7] Build + avvio app/nginx (HTTP)"
docker compose build
docker compose up -d app nginx

echo "==> [6/7] Certificato Let's Encrypt"
docker compose run --rm --entrypoint certbot certbot certonly \
  --webroot -w /var/www/certbot \
  --email "$CERTBOT_EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN" \
  -d "$WWW_DOMAIN" \
  --non-interactive

echo "==> [7/7] Abilita HTTPS + stack completo"
cp -f deploy/nginx.conf deploy/nginx.active.conf
docker compose up -d
docker compose ps

echo ""
echo "OK — https://${DOMAIN}"
echo "Supabase invariato: ${SUPABASE_CHECK}"
echo "Checklist: /  /#prenota  /gestionale  /privacy-policy  /cookie-policy"
