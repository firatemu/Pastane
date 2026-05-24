#!/usr/bin/env bash
# One-time VPS setup: TLS for studio.azem.cloud + Host Nginx vhost + Supabase Studio stack.
#
# Prerequisites:
#   - DNS A record studio.azem.cloud → VPS
#   - .env.production with DASHBOARD_*, SUPABASE_* (Faz 8.0), POSTGRES_*
#
# Usage (on VPS, from repo root):
#   bash scripts/setup-studio-vps.sh
#
# Options:
#   SKIP_CERTBOT=1     Skip certbot (cert already includes studio.azem.cloud)
#   SKIP_NGINX=1       Skip nginx install/reload
#   SKIP_COMPOSE=1     Skip docker compose stack up
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/pastane-app/app}"
cd "$APP_DIR"

ENV_FILE="${ENV_FILE:-.env.production}"
NGINX_SRC="${NGINX_SRC:-deploy/nginx/pastane-studio.conf}"
NGINX_DST="${NGINX_DST:-/etc/nginx/sites-available/pastane-studio.conf}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: $ENV_FILE not found" >&2
  exit 1
fi

bash "$APP_DIR/scripts/validate-env.sh" "$ENV_FILE"

if [[ "${SKIP_CERTBOT:-}" != "1" ]]; then
  echo "Ensuring TLS cert for studio.azem.cloud..."
  if [[ ! -d /etc/letsencrypt/live/studio.azem.cloud ]]; then
    docker run --rm \
      -v /etc/letsencrypt:/etc/letsencrypt \
      -v /var/lib/letsencrypt:/var/lib/letsencrypt \
      -v /var/www/certbot:/var/www/certbot \
      -v /var/log/letsencrypt:/var/log/letsencrypt \
      certbot/certbot certonly --webroot -w /var/www/certbot \
      --non-interactive --agree-tos --email "${DASHBOARD_USERNAME:-studio-admin}@azem.cloud" \
      -d studio.azem.cloud
  else
    echo "studio.azem.cloud certificate already present."
  fi
fi

if [[ "${SKIP_NGINX:-}" != "1" ]]; then
  bash "$APP_DIR/scripts/setup-studio-nginx-docker.sh"
fi

if [[ "${SKIP_COMPOSE:-}" != "1" ]]; then
  # shellcheck source=scripts/lib/compose-prod.sh
  source "$APP_DIR/scripts/lib/compose-prod.sh"
  COMPOSE_PROD_ROOT="$APP_DIR"
  ensure_supabase_stack_up
fi

echo "Studio setup complete. Open https://studio.azem.cloud and sign in with DASHBOARD_USERNAME / DASHBOARD_PASSWORD."
