#!/usr/bin/env bash
# Reset Next.js dev caches for web/admin/courier when CSS/chunks break after host build + Docker dev.
#
# Gerekli zorunda kalınan başka örnek: `ENOENT … open …/node_modules/.pnpm/next@…/dist/...` — kökten
# `pnpm install`/hoist değiştiren ayar yapıldıktan sonra eski `.next-docker` bazen fizik olarak
# artık var olmayan `.pnpm/` yollarına kilit kalır; bu script o önbelleği siler ve konteyneri yeniden
# oluşturur (Next bir sonraki derlemede geçerli `node_modules` yolunu üretir).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE=(docker compose --env-file "$ROOT/.env" -f "$ROOT/docker/docker-compose.dev.yml")

echo "Stopping frontend dev containers (web, admin, courier)…"
"${COMPOSE[@]}" stop web admin courier 2>/dev/null || true

for app in web admin courier; do
  for dir in .next .next-docker .next-host; do
    path="$ROOT/apps/$app/$dir"
    if [[ -d "$path" ]]; then
      echo "Removing $path"
      rm -rf "$path"
    fi
  done
done

echo "Recreating frontend containers (NEXT_DIST_DIR=.next-docker)…"
"${COMPOSE[@]}" up -d --force-recreate web admin courier

echo "Waiting for Next dev (first compile can take ~30–60s)…"
for port in 3001 3000; do
  code="000"
  for _ in $(seq 1 24); do
    code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$port/_next/static/css/app/layout.css" 2>/dev/null || echo "000")
    [[ "$code" == "200" ]] && break
    sleep 5
  done
  echo "layout.css on :$port → HTTP $code"
  if [[ "$code" != "200" ]]; then
    echo "warning: :$port CSS not ready yet — open the app once, then hard-refresh (Ctrl+Shift+R)." >&2
  fi
done

echo ""
echo "Done. Hard-refresh the browser (Ctrl+Shift+R)."
echo "Use pnpm build:ci (not pnpm build) while Docker dev is running."
