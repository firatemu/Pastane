#!/usr/bin/env bash
# Copy production pg_dump to staging workspace WITHOUT touching prod DB writes.
# Reads from running prod postgres (read-only pg_dump) OR from existing .dump file.
#
# Usage:
#   bash scripts/staging/copy-prod-dump-for-staging.sh
#   DUMP_SOURCE=/var/backups/pastane/pastane-pg-XXX.dump bash scripts/staging/copy-prod-dump-for-staging.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/staging/_load-env.sh
source "$ROOT/scripts/staging/_load-env.sh"

ENV_PROD="${ENV_PROD:-.env.production}"
COMPOSE_PROD="${COMPOSE_PROD:-docker/docker-compose.prod.yml}"
PROJECT_PROD="${PROJECT_PROD:-pastane-prod}"

STAGING_DUMP_DIR="${STAGING_DUMP_DIR:-$BACKUP_DIR}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${STAGING_DUMP_DIR}/prod-source-${STAMP}.dump"

mkdir -p "$STAGING_DUMP_DIR"

if [[ -n "${DUMP_SOURCE:-}" ]]; then
  if [[ ! -f "$DUMP_SOURCE" ]]; then
    echo "error: DUMP_SOURCE not found: $DUMP_SOURCE" >&2
    exit 1
  fi
  cp "$DUMP_SOURCE" "$OUT"
  echo "Copied existing dump → $OUT"
  printf '%s\n' "$OUT" > "${STAGING_DUMP_DIR}/.latest-prod-source-dump"
  exit 0
fi

if [[ ! -f "$ENV_PROD" ]]; then
  echo "error: $ENV_PROD missing. Set DUMP_SOURCE=... or create production env on VPS." >&2
  exit 1
fi

set -a
# shellcheck source=/dev/null
source "$ENV_PROD"
set +a

echo "Creating read-only pg_dump from production postgres (prod stack stays up)..."
docker compose --project-name "$PROJECT_PROD" --env-file "$ENV_PROD" -f "$COMPOSE_PROD" \
  exec -T postgres pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -Fc -f /tmp/staging-source.dump

docker compose --project-name "$PROJECT_PROD" --env-file "$ENV_PROD" -f "$COMPOSE_PROD" \
  cp "postgres:/tmp/staging-source.dump" "$OUT"

printf '%s\n' "$OUT" > "${STAGING_DUMP_DIR}/.latest-prod-source-dump"
echo "Production dump copied (read-only) → $OUT"
echo "Next: bash scripts/staging/restore-to-staging.sh"
