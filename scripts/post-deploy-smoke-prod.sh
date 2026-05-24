#!/usr/bin/env bash
# Read-only production smoke after deploy (no login/cart/order — no prod credentials required).
#
# Usage:
#   PROD_API_URL=https://api.azem.cloud bash scripts/post-deploy-smoke-prod.sh
#   bash scripts/post-deploy-smoke-prod.sh   # reads PUBLIC_API_URL or API_URL from .env.production
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env.production}"

resolve_api_base() {
  if [[ -n "${PROD_API_URL:-}" ]]; then
    printf '%s' "${PROD_API_URL%/}"
    return
  fi
  if [[ -f "$ENV_FILE" ]]; then
    local v
    v="$(grep -E '^[[:space:]]*PUBLIC_API_URL=' "$ENV_FILE" 2>/dev/null | tail -n1 | cut -d= -f2- | tr -d '\r"'"'"'')"
    if [[ -n "${v// /}" ]]; then
      printf '%s' "${v%/}"
      return
    fi
    v="$(grep -E '^[[:space:]]*API_URL=' "$ENV_FILE" 2>/dev/null | tail -n1 | cut -d= -f2- | tr -d '\r"'"'"'')"
    if [[ -n "${v// /}" ]]; then
      printf '%s' "${v%/}"
      return
    fi
  fi
  printf '%s' "http://127.0.0.1:3003"
}

API_BASE="$(resolve_api_base)"
HEALTH_URL="${API_BASE}/health"
PRODUCTS_URL="${API_BASE}/api/v1/products?limit=1"

failures=0
check_http() {
  local name="$1" url="$2" expected="$3"
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$url" || echo 000)"
  if [[ "$code" != "$expected" ]]; then
    echo "[post-deploy-smoke] FAIL $name expected HTTP $expected got $code ($url)"
    failures=$((failures + 1))
  else
    echo "[post-deploy-smoke] OK   $name HTTP $code"
  fi
}

echo "[post-deploy-smoke] API base: $API_BASE"

if ! curl -sf --max-time 15 "$HEALTH_URL" | grep -q '"status":"ok"'; then
  echo "[post-deploy-smoke] FAIL GET /health body or status ($HEALTH_URL)"
  failures=$((failures + 1))
else
  echo "[post-deploy-smoke] OK   GET /health status ok"
fi

check_http "GET /api/v1/products" "$PRODUCTS_URL" 200

PRODUCTS_JSON="$(curl -s --max-time 15 "$PRODUCTS_URL" || echo '{}')"
PRODUCT_ID="$(printf '%s' "$PRODUCTS_JSON" | python3 - <<'PY'
import json, sys
try:
    doc = json.load(sys.stdin)
except json.JSONDecodeError:
    sys.exit(0)
data = doc.get("data")
if isinstance(data, list) and data:
    print(data[0].get("id") or "")
elif isinstance(data, dict):
    items = data.get("items")
    if isinstance(items, list) and items:
        print(items[0].get("id") or "")
PY
)"

if [[ -z "$PRODUCT_ID" || "$PRODUCT_ID" == "null" ]]; then
  echo "[post-deploy-smoke] FAIL GET /products — no product id in response"
  failures=$((failures + 1))
else
  echo "[post-deploy-smoke] OK   catalog product id present"
fi

if [[ "$failures" -gt 0 ]]; then
  echo "[post-deploy-smoke] finished with $failures failure(s)" >&2
  exit 1
fi

echo "[post-deploy-smoke] all checks passed"
