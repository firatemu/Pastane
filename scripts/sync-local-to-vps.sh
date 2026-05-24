#!/usr/bin/env bash
# Full local → VPS sync: optional code deploy, DB (public schema), MinIO.
#
# Usage:
#   CONFIRM=YES bash scripts/sync-local-to-vps.sh
#   CONFIRM=YES SKIP_DEPLOY=1 bash scripts/sync-local-to-vps.sh   # data only
#   CONFIRM=YES SKIP_DB=1 bash scripts/sync-local-to-vps.sh
#   CONFIRM=YES SKIP_MINIO=1 bash scripts/sync-local-to-vps.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "${CONFIRM:-}" != "YES" ]]; then
  echo "error: set CONFIRM=YES — overwrites VPS production data with local dev data." >&2
  exit 1
fi

if [[ "${SKIP_DEPLOY:-}" != "1" ]]; then
  echo "=== Code deploy (pnpm push:vps) ==="
  pnpm push:vps:fast
fi

if [[ "${SKIP_DB:-}" != "1" ]]; then
  echo "=== Database sync ==="
  CONFIRM=YES bash "$ROOT/scripts/sync-local-db-to-vps.sh"
fi

if [[ "${SKIP_MINIO:-}" != "1" ]]; then
  echo "=== MinIO sync ==="
  CONFIRM=YES bash "$ROOT/scripts/sync-local-minio-to-vps.sh"
fi

echo "=== Verification ==="
bash "$ROOT/scripts/sync-local-to-vps-verify.sh"
