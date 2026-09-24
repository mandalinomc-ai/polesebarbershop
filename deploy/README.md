# Deploy VPS — felicepolesebarbershop.it

Stack: **Docker Compose** (`app` Next.js standalone + `nginx` + `certbot` renew).

## Dati (obbligatorio)

Usa lo **stesso** progetto Supabase della dashboard attuale.  
Copia URL e chiavi in `.env.production` — **nessuna** migrazione/reset DB.

## Sul server Ubuntu (Aruba)

```bash
# 1) Codice sul VPS (git clone o rsync)
cd /var/www/felice-polese   # esempio

# 2) Env di produzione
cp .env.production.example .env.production
nano .env.production   # SUPABASE_* = stessi valori della dashboard

# 3) DNS: A/AAAA di felicepolesebarbershop.it e www → IP VPS

# 4) Bootstrap (swap, Docker, SSL, compose)
sudo bash scripts/vps-bootstrap.sh
```

## File

| File | Ruolo |
|------|--------|
| `Dockerfile` | Build multi-stage standalone |
| `docker-compose.yml` | `restart: always` su app/nginx |
| `deploy/nginx.conf` | HTTPS + gzip + cache asset |
| `deploy/nginx.http-bootstrap.conf` | Solo HTTP per ACME |
| `deploy/nginx.active.conf` | File montato in nginx (scritto dallo script) |
| `.env.production.example` | Template variabili |
| `scripts/vps-bootstrap.sh` | Installazione automatica VPS |

Privacy `/privacy-policy`, cookie `/cookie-policy` e banner consenso sono già nel codice sito.
