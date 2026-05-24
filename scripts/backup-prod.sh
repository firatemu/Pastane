#!/usr/bin/env bash
# Logical PostgreSQL backup (custom format) + optional MinIO volume note.
#
# Usage:
#   bash scripts/backup-prod.sh                              # supabase-db (default after Faz 7)
#   DB_SERVICE=postgres bash scripts/backup-prod.sh          # legacy rollback window only
#   COMPOSE_FILE=... ENV_FILE=... PROJECT_NAME=...           # overrides
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
DB_SERVICE="${DB_SERVICE:-supabase-db}"

# shellcheck source=scripts/lib/compose-prod.sh
source "$ROOT/scripts/lib/compose-prod.sh"
COMPOSE_PROD_ROOT="$ROOT"

BACKUP_DIR_FROM_CALLER="${BACKUP_DIR:-}"

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

if [[ -n "${BACKUP_DIR_FROM_CALLER}" ]]; then
  BACKUP_DIR="${BACKUP_DIR_FROM_CALLER}"
else
  BACKUP_DIR="${BACKUP_DIR:-/var/www/pastane-app/backups}"
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
  compose_supabase exec -T supabase-db pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -Fc -f "/tmp/backup.dump"
  compose_supabase cp "supabase-db:/tmp/backup.dump" "$DUMP_FILE"
else
  echo "Writing legacy postgres backup to $DUMP_FILE (profile ${COMPOSE_LEGACY_PROFILE})"
  compose_prod_app --profile "$COMPOSE_LEGACY_PROFILE" exec -T postgres \
    pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -Fc -f "/tmp/backup.dump"
  compose_prod_app --profile "$COMPOSE_LEGACY_PROFILE" cp "postgres:/tmp/backup.dump" "$DUMP_FILE"
fi

echo "MinIO: mirror objects separately (mc mirror) or snapshot volumes; see docs/backup-and-restore.md"

find "$OUT_DIR" -name 'pastane-pg-*.dump' -type f -mtime "+${RETAIN_DAYS}" -print -delete 2>/dev/null || true

echo "Backup complete."
