#!/usr/bin/env bash
# Smoke tests against staging API on loopback :3103
set -euo pipefail

BASE="${STAGING_API_URL:-http://127.0.0.1:3103}/api/v1"
ADMIN_PHONE="${STAGING_ADMIN_PHONE:-905559000001}"
ADMIN_PASS="${STAGING_ADMIN_PASSWORD:-StagingTest123!}"
CUSTOMER_PHONE="${STAGING_CUSTOMER_PHONE:-905559000010}"
CUSTOMER_PASS="${STAGING_CUSTOMER_PASSWORD:-StagingTest123!}"
COURIER_PHONE="${STAGING_COURIER_PHONE:-905559000004}"
COURIER_PASS="${STAGING_COURIER_PASSWORD:-StagingTest123!}"

failures=0
check() {
  local name="$1" expected="$2" actual="$3"
  if [[ "$actual" != "$expected" ]]; then
    echo "FAIL $name expected HTTP $expected got $actual"
    failures=$((failures + 1))
  else
    echo "OK   $name HTTP $actual"
  fi
}

echo "=== Staging smoke: $BASE ==="

code=$(curl -s -o /tmp/staging-health.json -w '%{http_code}' "${BASE%/api/v1}/health" || echo 000)
check "GET /health" 200 "$code"

login_token() {
  local phone="$1" pass="$2"
  curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
    -d "{\"phone\":\"$phone\",\"password\":\"$pass\"}" | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).data?.accessToken||''"
}

ADMIN_TOKEN=$(login_token "$ADMIN_PHONE" "$ADMIN_PASS")
CUST_TOKEN=$(login_token "$CUSTOMER_PHONE" "$CUSTOMER_PASS")
KUR_TOKEN=$(login_token "$COURIER_PHONE" "$COURIER_PASS")

if [[ -z "$ADMIN_TOKEN" ]]; then echo "FAIL admin login (token empty — password may need re-seed after sanitize)"; failures=$((failures+1)); fi

code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/products")
check "GET /products" 200 "$code"

PRODUCT_ID=$(curl -s "$BASE/products" | node -pe "const j=JSON.parse(require('fs').readFileSync(0,'utf8')); (j.data?.items?.[0]?.id)||(j.data?.[0]?.id)||''" 2>/dev/null || echo "")

if [[ -n "$CUST_TOKEN" && -n "$PRODUCT_ID" ]]; then
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/cart/items" \
    -H "Authorization: Bearer $CUST_TOKEN" -H 'Content-Type: application/json' \
    -d "{\"productId\":\"$PRODUCT_ID\",\"quantity\":1}")
  check "POST /cart/items" 201 "$code"
  code=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $CUST_TOKEN" "$BASE/cart")
  check "GET /cart" 200 "$code"
fi

if [[ -n "$CUST_TOKEN" ]]; then
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/orders" \
    -H "Authorization: Bearer $CUST_TOKEN" -H 'Content-Type: application/json' \
    -d '{"deliveryType":"PICKUP","pickupStoreId":"00000000-0000-4000-8000-000000000101"}')
  check "POST /orders" 201 "$code"
  code=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $CUST_TOKEN" "$BASE/loyalty/me")
  check "GET /loyalty/me" 200 "$code"
fi

if [[ -n "$ADMIN_TOKEN" ]]; then
  code=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE/orders")
  check "GET /orders (admin)" 200 "$code"
fi

if [[ -n "$KUR_TOKEN" ]]; then
  code=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $KUR_TOKEN" "$BASE/deliveries/my")
  check "GET /deliveries/my" 200 "$code"
fi

# İyzico callback route reachable (may 404/405 without body — not 502)
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/payments/callback" -H 'Content-Type: application/json' -d '{}' || echo 000)
if [[ "$code" == "502" || "$code" == "000" ]]; then
  echo "FAIL POST /payments/callback HTTP $code"
  failures=$((failures+1))
else
  echo "OK   POST /payments/callback route reachable HTTP $code"
fi

if [[ "$failures" -gt 0 ]]; then
  echo "Staging smoke finished with $failures failure(s)"
  exit 1
fi
echo "Staging smoke: all checks passed"
