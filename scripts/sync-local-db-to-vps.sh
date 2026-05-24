#!/usr/bin/env bash
# Dump local dev PostgreSQL (public schema only) and restore on VPS production.
#
# Usage:
#   CONFIRM=YES bash scripts/sync-local-db-to-vps.sh
#   LOCAL_DATABASE_URL=postgresql://... CONFIRM=YES bash scripts/sync-local-db-to-vps.sh
#
# Requires: pg_dump, scp, ssh; scripts/deploy-vps.env.local with VPS_HOST
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if [[ "${CONFIRM:-}" != "YES" ]]; then
  echo "error: set CONFIRM=YES — this overwrites VPS ${POSTGRES_DB:-pastane_db} data." >&2
  exit 1
fi

LOCAL_ENV="$SCRIPT_DIR/deploy-vps.env.local"
if [[ -f "$LOCAL_ENV" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "$LOCAL_ENV"
  set +a
fi

VPS_HOST="${VPS_HOST:-}"
VPS_USER="${VPS_USER:-deploy}"
VPS_PORT="${VPS_PORT:-22}"
VPS_APP_DIR="${VPS_APP_DIR:-/var/www/pastane-app/app}"
VPS_BACKUP_DIR="${VPS_BACKUP_DIR:-/var/www/pastane-app/backups}"

if [[ -z "$VPS_HOST" || "$VPS_HOST" == "YOUR_VPS_IP" ]]; then
  echo "error: set VPS_HOST in scripts/deploy-vps.env.local" >&2
  exit 1
fi

if [[ -f "$ROOT/.env" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "$ROOT/.env"
  set +a
fi

LOCAL_URL="${LOCAL_DATABASE_URL:-${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP_LOCAL="/tmp/pastane-local-${STAMP}.dump"
DUMP_NAME="pastane-local-${STAMP}.dump"

echo "[1] Local pg_dump (public schema only) from ${LOCAL_URL%%@*}@..."
run_pg_dump() {
  local image="$1"
  local tmpdir
  tmpdir="$(mktemp -d)"
  docker run --rm --network host -v "${tmpdir}:/out" "$image" \
    pg_dump -Fc -n public "$LOCAL_URL" -f /out/dump.dump
  mv "${tmpdir}/dump.dump" "$DUMP_LOCAL"
  rmdir "$tmpdir"
}

PG_DUMP_IMAGE="${PG_DUMP_IMAGE:-postgres:17-alpine}"
if command -v pg_dump >/dev/null 2>&1; then
  if pg_dump -Fc -n public "$LOCAL_URL" -f "$DUMP_LOCAL" 2>/dev/null && [[ -s "$DUMP_LOCAL" ]]; then
    :
  else
    echo "Host pg_dump failed (version mismatch?) — using ${PG_DUMP_IMAGE}..."
    run_pg_dump "$PG_DUMP_IMAGE"
  fi
else
  run_pg_dump "$PG_DUMP_IMAGE"
fi
echo "Wrote $DUMP_LOCAL ($(du -h "$DUMP_LOCAL" | cut -f1))"

SSH=(ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -p "$VPS_PORT")
SCP=(scp -o BatchMode=yes -o StrictHostKeyChecking=accept-new -P "$VPS_PORT")
[[ -n "${VPS_SSH_IDENTITY:-}" ]] && SSH+=(-i "$VPS_SSH_IDENTITY") && SCP+=(-i "$VPS_SSH_IDENTITY")

echo "[2] Upload dump to VPS..."
"${SCP[@]}" "$DUMP_LOCAL" "${VPS_USER}@${VPS_HOST}:${VPS_BACKUP_DIR}/${DUMP_NAME}"

REMOTE_DUMP="${VPS_BACKUP_DIR}/${DUMP_NAME}"
echo "[3] Restore on VPS (restore-prod.sh)..."
"${SSH[@]}" "${VPS_USER}@${VPS_HOST}" \
  "cd $(printf '%q' "$VPS_APP_DIR") && CONFIRM=YES DUMP_FILE=$(printf '%q' "$REMOTE_DUMP") bash scripts/restore-prod.sh"

echo "DB sync complete: $REMOTE_DUMP"
