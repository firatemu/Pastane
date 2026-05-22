#!/usr/bin/env bash
# Logical PostgreSQL backup (custom format) + optional MinIO volume note.
# Requires docker compose Postgres running and .env.production with POSTGRES_* vars.
# Usage:
#   bash scripts/backup-prod.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker/docker-compose.prod.yml}"

# Preserve BACKUP_DIR from the caller environment so `BACKUP_DIR=/tmp/foo ./scripts/backup-prod.sh`
# is not overwritten by values in `.env.prod`.
BACKUP_DIR_FROM_CALLER="${BACKUP_DIR:-}"

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

if [[ -n "${BACKUP_DIR_FROM_CALLER}" ]]; then
  BACKUP_DIR="${BACKUP_DIR_FROM_CALLER}"
else
  BACKUP_DIR="${BACKUP_DIR:-/var/backups/pastane}"
fi
RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-7}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
if [[ "$BACKUP_DIR" = /* ]]; then
  OUT_DIR="$BACKUP_DIR"
else
  OUT_DIR="$ROOT/$BACKUP_DIR"
fi
mkdir -p "$OUT_DIR"

DUMP_FILE="$OUT_DIR/pastane-pg-${STAMP}.dump"

echo "Writing PostgreSQL backup to $DUMP_FILE"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -Fc -f "/tmp/backup.dump"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" cp "postgres:/tmp/backup.dump" "$DUMP_FILE"

echo "MinIO: mirror objects separately (mc mirror) or snapshot volumes; see docs/backup-and-restore.md"

find "$OUT_DIR" -name 'pastane-pg-*.dump' -type f -mtime "+${RETAIN_DAYS}" -print -delete 2>/dev/null || true

echo "Backup complete."
