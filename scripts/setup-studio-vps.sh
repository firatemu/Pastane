#!/usr/bin/env bash
# One-time VPS setup: TLS for studio.azem.cloud + Host Nginx vhost + pgAdmin stack.
#
# Prerequisites:
#   - DNS A record studio.azem.cloud → VPS
#   - .env.production with SUPABASE_STUDIO_EMAIL, SUPABASE_STUDIO_PASSWORD, POSTGRES_*
#
# Usage (on VPS, from repo root):
#   bash scripts/setup-studio-vps.sh
#
# Options:
#   SKIP_CERTBOT=1     Skip certbot (cert already includes studio.azem.cloud)
#   SKIP_NGINX=1       Skip nginx install/reload
#   SKIP_COMPOSE=1     Skip docker compose studio up
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
  echo "Expanding Let's Encrypt cert to include studio.azem.cloud..."
  if ! sudo -n certbot certonly --nginx --non-interactive --agree-tos --expand \
    -d azem.cloud -d www.azem.cloud -d api.azem.cloud -d admin.azem.cloud \
    -d courier.azem.cloud -d storage.azem.cloud -d studio.azem.cloud 2>/dev/null; then
    echo "::notice::certbot requires root. Run on VPS: sudo bash scripts/setup-studio-vps-root.sh" >&2
    if [[ "${REQUIRE_SUDO:-}" == "1" ]]; then
      exit 1
    fi
  fi
fi

if [[ "${SKIP_NGINX:-}" != "1" ]]; then
  echo "Installing nginx vhost for studio.azem.cloud..."
  if sudo -n install -o root -m 0644 "$APP_DIR/$NGINX_SRC" "$NGINX_DST" 2>/dev/null \
    && sudo -n ln -sf "$NGINX_DST" /etc/nginx/sites-enabled/pastane-studio.conf 2>/dev/null \
    && sudo -n nginx -t 2>/dev/null \
    && sudo -n systemctl reload nginx 2>/dev/null; then
    echo "nginx studio vhost installed."
  else
    echo "::notice::nginx install requires root. Run on VPS: sudo bash scripts/setup-studio-vps-root.sh" >&2
    if [[ "${REQUIRE_SUDO:-}" == "1" ]]; then
      exit 1
    fi
  fi
fi

if [[ "${SKIP_COMPOSE:-}" != "1" ]]; then
  # shellcheck source=scripts/lib/compose-prod.sh
  source "$APP_DIR/scripts/lib/compose-prod.sh"
  COMPOSE_PROD_ROOT="$APP_DIR"
  ensure_supabase_db_up
  ensure_supabase_studio_up
fi

echo "Studio setup complete. Open https://studio.azem.cloud and sign in with SUPABASE_STUDIO_EMAIL."
