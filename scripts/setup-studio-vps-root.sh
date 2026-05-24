#!/usr/bin/env bash
# Run ON THE VPS AS ROOT (sudo) after deploy user prepared the repo:
#   sudo bash /var/www/pastane-app/app/scripts/setup-studio-vps-root.sh
#
# Installs nginx vhost and expands TLS cert for studio.azem.cloud.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/pastane-app/app}"
NGINX_SRC="$APP_DIR/deploy/nginx/pastane-studio.conf"
NGINX_DST="/etc/nginx/sites-available/pastane-studio.conf"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "error: run as root (sudo bash $0)" >&2
  exit 1
fi

echo "Expanding certificate for studio.azem.cloud..."
if certbot certificates 2>/dev/null | grep -q 'studio.azem.cloud'; then
  echo "studio.azem.cloud certificate already present."
else
  certbot certonly --nginx --non-interactive --agree-tos -d studio.azem.cloud \
    || certbot certonly --webroot -w /var/www/certbot --non-interactive --agree-tos -d studio.azem.cloud
fi

echo "Installing nginx vhost..."
install -o root -m 0644 "$NGINX_SRC" "$NGINX_DST"
ln -sf "$NGINX_DST" /etc/nginx/sites-enabled/pastane-studio.conf

# Ensure HTTP redirect vhost lists studio (for renewals)
PASTANE_APP="/etc/nginx/sites-available/pastane-app"
if [[ -f "$PASTANE_APP" ]] && ! grep -q 'studio.azem.cloud' "$PASTANE_APP"; then
  sed -i 's/storage.azem.cloud;/storage.azem.cloud studio.azem.cloud;/' "$PASTANE_APP" || true
fi

nginx -t
systemctl reload nginx
echo "Root studio nginx + TLS setup complete."
