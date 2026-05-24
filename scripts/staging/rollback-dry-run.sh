#!/usr/bin/env bash
# Rollback dry-run simulation: tear down staging supabase, verify prod still healthy.
# Does NOT stop or modify production containers/volumes/env.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ENV_PROD="${ENV_PROD:-.env.production}"
ENV_STAGING="${ENV_STAGING:-.env.staging}"
COMPOSE_PROD="${COMPOSE_PROD:-docker/docker-compose.prod.yml}"
COMPOSE_STAGING="${COMPOSE_STAGING:-docker/docker-compose.staging.yml}"
COMPOSE_SUPABASE="${COMPOSE_SUPABASE:-docker/docker-compose.supabase.staging.yml}"
PROJECT_PROD="${PROJECT_PROD:-pastane-prod}"
PROJECT_STAGING="${PROJECT_STAGING:-pastane-staging}"
PROJECT_SUPABASE="${PROJECT_SUPABASE:-supabase-staging}"

echo "=== Rollback dry-run: staging down, prod unchanged ==="

echo "[1] Staging app stack down"
docker compose --project-name "$PROJECT_STAGING" --env-file "$ENV_STAGING" -f "$COMPOSE_STAGING" down --remove-orphans || true

echo "[2] Staging supabase stack down (volume retained unless -v)"
docker compose --project-name "$PROJECT_SUPABASE" --env-file "$ENV_STAGING" -f "$COMPOSE_SUPABASE" down || true

echo "[3] Verify production still running"
docker compose --project-name "$PROJECT_PROD" --env-file "$ENV_PROD" -f "$COMPOSE_PROD" ps

echo "[4] Production health (must stay 200)"
code=$(curl -s -o /dev/null -w '%{http_code}' https://api.azem.cloud/health 2>/dev/null || curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3003/health)
if [[ "$code" != "200" ]]; then
  echo "WARN: prod health HTTP $code — investigate (staging teardown should not affect prod)"
  exit 1
fi

echo "[5] Simulated prod rollback (no-op): .env.production unchanged, postgres_data volume untouched"
echo "Rollback dry-run OK — production healthy, staging stopped"
