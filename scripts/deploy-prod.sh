#!/usr/bin/env bash
# Forward production deploy: validate compose, rebuild images, recreate containers.
# Prerequisites: .env.production at repo root (copy from .env.production.example).
# Usage:
#   bash scripts/deploy-prod.sh
# Optional:
#   ENV_FILE=.env.production COMPOSE_FILE=docker/docker-compose.prod.yml bash scripts/deploy-prod.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker/docker-compose.prod.yml}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: $ENV_FILE not found. Copy .env.production.example to .env.production and fill secrets." >&2
  exit 1
fi

if grep -qE 'change_me|change_me_|placeholder' "$ENV_FILE" 2>/dev/null; then
  echo "warning: $ENV_FILE may still contain placeholder secrets — verify before real production." >&2
fi

echo "Using ENV_FILE=$ENV_FILE COMPOSE_FILE=$COMPOSE_FILE"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config >/dev/null
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build

API_HOST="$(grep -E '^DOMAIN_API=' "$ENV_FILE" | tail -n1 | cut -d= -f2-)"
if [[ -z "$API_HOST" ]]; then
  API_HOST="api.azem.cloud"
fi

echo "Deploy finished."
echo "API health via Nginx before TLS: curl -fsS -H 'Host: ${API_HOST}' http://127.0.0.1/health"
echo "API health after TLS: curl -fsS https://${API_HOST}/health"
