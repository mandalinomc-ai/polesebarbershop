#!/usr/bin/env bash
# DEPRECATED — production is on VPS 94.177.161.26 (felicepolesebarbershop.it).
# Do not use this script to configure or redeploy Vercel.
echo "ERROR: Vercel production deploy is disabled. Use Docker on the VPS:" >&2
echo "  cd /var/www/felice-polese && docker compose down && docker compose up -d --build" >&2
exit 1
