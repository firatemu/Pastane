#!/usr/bin/env bash
# Faz 6.8 — Full staging dry-run orchestrator (VPS). Does NOT modify production compose/env/domains.
#
# Prerequisites:
#   cp .env.staging.example .env.staging && chmod 600 .env.staging  # fill secrets
#   Production stack running (for read-only dump)
#
# Usage:
#   bash scripts/staging/run-staging-dry-run.sh
#   bash scripts/staging/run-staging-dry-run.sh --skip-dump   # reuse latest dump
#   bash scripts/staging/run-staging-dry-run.sh --skip-build  # reuse images
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.staging}"
COMPOSE_SUPABASE="docker/docker-compose.supabase.staging.yml"
COMPOSE_APP="docker/docker-compose.staging.yml"
SKIP_DUMP=0
SKIP_BUILD=0

for arg in "$@"; do
  case "$arg" in
    --skip-dump) SKIP_DUMP=1 ;;
    --skip-build) SKIP_BUILD=1 ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: $ENV_FILE missing. cp .env.staging.example .env.staging" >&2
  exit 1
fi

# Required secrets only (optional pgAdmin profile may keep change_me_* placeholders)
REQUIRED_STAGING_KEYS=(
  STAGING_POSTGRES_PASSWORD
  POSTGRES_PASSWORD
  REDIS_PASSWORD
  JWT_SECRET
  JWT_REFRESH_SECRET
  MINIO_SECRET_KEY
)
for key in "${REQUIRED_STAGING_KEYS[@]}"; do
  val="$(grep -E "^${key}=" "$ENV_FILE" | tail -1 | cut -d= -f2- || true)"
  if [[ -z "$val" || "$val" == *change_me* || "$val" == *placeholder* ]]; then
    echo "error: set $key in $ENV_FILE (no change_me/placeholder)" >&2
    exit 1
  fi
done

# shellcheck source=scripts/staging/_load-env.sh
source "$ROOT/scripts/staging/_load-env.sh"

echo "=== Faz 6.8 Staging dry-run ==="
echo "Production: NOT modified"

echo "[A] Resource snapshot (before)"
bash "$ROOT/scripts/staging/resource-snapshot.sh"

echo "[B] Supabase staging DB up"
docker compose --project-name supabase-staging --env-file "$ENV_FILE" -f "$COMPOSE_SUPABASE" up -d supabase-db

if [[ "$SKIP_DUMP" -eq 0 ]]; then
  echo "[C] Copy production dump (read-only)"
  bash "$ROOT/scripts/staging/copy-prod-dump-for-staging.sh"
fi

echo "[D] Restore + sanitize + staging passwords"
bash "$ROOT/scripts/staging/restore-to-staging.sh"

if [[ "$SKIP_BUILD" -eq 0 ]]; then
  echo "[E] Build staging app images"
  docker compose --project-name pastane-staging --env-file "$ENV_FILE" -f "$COMPOSE_APP" build
fi

echo "[F] Start staging app stack"
docker compose --project-name pastane-staging --env-file "$ENV_FILE" -f "$COMPOSE_APP" up -d

echo "[G] Prisma migrate deploy (idempotent check)"
docker compose --project-name pastane-staging --env-file "$ENV_FILE" -f "$COMPOSE_APP" \
  exec -T api sh -lc 'cd /app/packages/database && npx prisma migrate status --schema=schema.prisma'

echo "[H] Smoke tests"
bash "$ROOT/scripts/staging/smoke-staging.sh"

echo "[I] Cutover timing"
bash "$ROOT/scripts/staging/measure-cutover-timing.sh" || true

echo "[J] Resource snapshot (after)"
bash "$ROOT/scripts/staging/resource-snapshot.sh"

echo "[K] Rollback dry-run (staging down, prod check)"
bash "$ROOT/scripts/staging/rollback-dry-run.sh"

echo "=== Staging dry-run complete ==="
echo "Reports: ${STAGING_TIMING_REPORT:-/var/backups/pastane-staging/cutover-timing-report.json}"
echo "Re-start staging: docker compose --project-name pastane-staging --env-file .env.staging -f docker/docker-compose.staging.yml up -d"
