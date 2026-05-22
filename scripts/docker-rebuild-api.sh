#!/usr/bin/env bash
# Rebuild and restart API dev container (repo root .env + compose paths).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f "$ROOT/.env" ]]; then
  echo "error: $ROOT/.env not found. Copy from .env.example first." >&2
  exit 1
fi

COMPOSE=(docker compose --env-file "$ROOT/.env" -f "$ROOT/docker/docker-compose.dev.yml")

echo "Building API image…"
"${COMPOSE[@]}" build api

echo "Recreating API container…"
"${COMPOSE[@]}" up -d --force-recreate api

echo "Waiting for Nest…"
for _ in $(seq 1 24); do
  if curl -sf "http://127.0.0.1:3003/api/v1/health" >/dev/null 2>&1; then
    echo "API health OK"
    break
  fi
  sleep 5
done

sleep 2
if docker logs pastane_api_dev 2>&1 | grep -q 'Mapped {/api/v1/products/admin, GET}'; then
  echo "products/admin route registered"
else
  echo "warning: products/admin route not found in logs — check: docker logs pastane_api_dev" >&2
fi
