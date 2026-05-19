#!/usr/bin/env bash
# Forward production deploy: validate compose, rebuild images, recreate containers.
# Prerequisites: .env.prod at repo root (copy from .env.prod.example).
# Usage:
#   bash scripts/deploy-prod.sh
# Optional:
#   ENV_FILE=.env.prod COMPOSE_FILE=docker/docker-compose.prod.yml bash scripts/deploy-prod.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.prod}"
COMPOSE_FILE="${COMPOSE_FILE:-docker/docker-compose.prod.yml}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: $ENV_FILE not found. Copy .env.prod.example to .env.prod and fill secrets." >&2
  exit 1
fi

if grep -qE 'change_me|change_me_|placeholder' "$ENV_FILE" 2>/dev/null; then
  echo "warning: $ENV_FILE may still contain placeholder secrets — verify before real production." >&2
fi

echo "Using ENV_FILE=$ENV_FILE COMPOSE_FILE=$COMPOSE_FILE"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config >/dev/null
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build

echo "Deploy finished. API health via Nginx: curl -fsS -H 'Host: api.staging.local' http://127.0.0.1/api/v1/health"
