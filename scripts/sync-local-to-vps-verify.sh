#!/usr/bin/env bash
# Compare local vs VPS Product counts and hit public health endpoints.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

LOCAL_ENV="$SCRIPT_DIR/deploy-vps.env.local"
if [[ -f "$LOCAL_ENV" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "$LOCAL_ENV"
  set +a
fi

VPS_HOST="${VPS_HOST:-}"
VPS_USER="${VPS_USER:-deploy}"
VPS_PORT="${VPS_PORT:-22}"

if [[ -f "$ROOT/.env" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "$ROOT/.env"
  set +a
fi

LOCAL_URL="${LOCAL_DATABASE_URL:-${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}}"

LOCAL_COUNT="$(docker run --rm --network host postgres:16-alpine psql "$LOCAL_URL" -tAc 'SELECT COUNT(*) FROM products;' 2>/dev/null || psql "$LOCAL_URL" -tAc 'SELECT COUNT(*) FROM products;' 2>/dev/null || echo 'n/a')"
echo "Local Product count: $LOCAL_COUNT"

if [[ -n "$VPS_HOST" && "$VPS_HOST" != "YOUR_VPS_IP" ]]; then
  SSH=(ssh -o BatchMode=yes -p "$VPS_PORT")
  [[ -n "${VPS_SSH_IDENTITY:-}" ]] && SSH+=(-i "$VPS_SSH_IDENTITY")
  VPS_COUNT="$("${SSH[@]}" "${VPS_USER}@${VPS_HOST}" \
    'docker exec pastane_supabase_db_prod psql -U postgres -d pastane_db -tAc "SELECT COUNT(*) FROM products;"' 2>/dev/null || echo 'n/a')"
  echo "VPS Product count:   $VPS_COUNT"
fi

echo -n "API health: "
curl -fsS -o /dev/null -w '%{http_code}\n' https://api.azem.cloud/health || echo "FAIL"

if [[ -n "$VPS_HOST" && "$VPS_HOST" != "YOUR_VPS_IP" ]]; then
  echo "VPS smoke..."
  "${SSH[@]}" "${VPS_USER}@${VPS_HOST}" 'bash /var/www/pastane-app/app/scripts/post-deploy-smoke-prod.sh' || true
fi
