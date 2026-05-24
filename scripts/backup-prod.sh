#!/usr/bin/env bash
# Logical PostgreSQL backup (custom format) + optional MinIO volume note.
#
# Usage:
#   bash scripts/backup-prod.sh                              # legacy postgres (default)
#   DB_SERVICE=supabase-db bash scripts/backup-prod.sh       # after Faz 7 cutover
#   COMPOSE_FILE=... ENV_FILE=... PROJECT_NAME=...           # overrides
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
DB_SERVICE="${DB_SERVICE:-postgres}"
COMPOSE_FILE="${COMPOSE_FILE:-docker/docker-compose.prod.yml}"
COMPOSE_SUPABASE="${COMPOSE_SUPABASE:-docker/docker-compose.supabase.prod.yml}"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-pastane-prod}"
PROJECT_SUPABASE="${SUPABASE_PROJECT_NAME:-supabase-prod}"

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

if [[ "$DB_SERVICE" == "supabase-db" ]]; then
  echo "Writing Supabase PostgreSQL backup to $DUMP_FILE"
  docker compose --project-name "$PROJECT_SUPABASE" --env-file "$ENV_FILE" -f "$COMPOSE_SUPABASE" \
    exec -T supabase-db pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -Fc -f "/tmp/backup.dump"
  docker compose --project-name "$PROJECT_SUPABASE" --env-file "$ENV_FILE" -f "$COMPOSE_SUPABASE" \
    cp "supabase-db:/tmp/backup.dump" "$DUMP_FILE"
else
  echo "Writing legacy postgres backup to $DUMP_FILE"
  docker compose --project-name "$PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" \
    exec -T postgres pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -Fc -f "/tmp/backup.dump"
  docker compose --project-name "$PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" \
    cp "postgres:/tmp/backup.dump" "$DUMP_FILE"
fi

echo "MinIO: mirror objects separately (mc mirror) or snapshot volumes; see docs/backup-and-restore.md"

find "$OUT_DIR" -name 'pastane-pg-*.dump' -type f -mtime "+${RETAIN_DAYS}" -print -delete 2>/dev/null || true

echo "Backup complete."
