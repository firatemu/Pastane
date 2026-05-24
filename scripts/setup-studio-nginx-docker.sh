#!/usr/bin/env bash
# Install studio nginx vhost and reload host nginx using Docker (no sudo password on deploy user).
# Cert for studio.azem.cloud must exist under /etc/letsencrypt/live/studio.azem.cloud/
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/pastane-app/app}"
cd "$APP_DIR"

CONF_SRC="$APP_DIR/deploy/nginx/pastane-studio.conf"

docker run --rm \
  -v /etc/nginx/sites-available:/etc/nginx/sites-available \
  -v "$CONF_SRC:/src:ro" \
  alpine:3.20 sh -c 'cp /src /etc/nginx/sites-available/pastane-studio.conf && chmod 644 /etc/nginx/sites-available/pastane-studio.conf'

docker run --rm \
  -v /etc/nginx/sites-enabled:/etc/nginx/sites-enabled \
  alpine:3.20 sh -c 'ln -sf /etc/nginx/sites-available/pastane-studio.conf /etc/nginx/sites-enabled/pastane-studio.conf'

# Reload host nginx (binary on VPS host, not in alpine image).
docker run --rm --pid host --privileged \
  -v /usr/sbin/nginx:/usr/sbin/nginx:ro \
  -v /usr/bin/nginx:/usr/bin/nginx:ro \
  -v /etc/nginx:/etc/nginx:ro \
  -v /var/run:/var/run \
  -v /etc/letsencrypt:/etc/letsencrypt:ro \
  alpine:3.20 nsenter -t 1 -m -u -i -n -p sh -c 'nginx -t && nginx -s reload'

echo "nginx studio vhost installed and reloaded."
