#!/usr/bin/env bash
# Poll production API health after deploy (for CI / operators).
# Required: API_HEALTH_URL (full URL including path, e.g. https://api.example.com/health)
set -euo pipefail

if [[ -z "${API_HEALTH_URL:-}" ]]; then
  echo "error: API_HEALTH_URL is not set (example: https://api.azem.cloud/health)." >&2
  exit 1
fi

TRIES="${API_HEALTH_TRIES:-30}"
DELAY="${API_HEALTH_DELAY_SEC:-5}"

for ((i = 1; i <= TRIES; i++)); do
  # API returns JSON like {"status":"ok","services":{...}}
  if curl -sf --max-time 15 "${API_HEALTH_URL}" | grep -q '"status":"ok"'; then
    echo "[post-deploy-health] OK (${i}/${TRIES}): ${API_HEALTH_URL}"
    exit 0
  fi
  echo "[post-deploy-health] attempt ${i}/${TRIES} failed, retrying in ${DELAY}s..."
  sleep "${DELAY}"
done

echo "::error::API health check failed after ${TRIES} tries: ${API_HEALTH_URL}" >&2
exit 1
