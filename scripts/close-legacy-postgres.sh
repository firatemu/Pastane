#!/usr/bin/env bash
# Final legacy postgres backup and stop (volume retained). Faz 7.2 closeout.
#
# Usage:
#   CONFIRM=YES bash scripts/close-legacy-postgres.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"

# shellcheck source=scripts/lib/compose-prod.sh
source "$ROOT/scripts/lib/compose-prod.sh"
COMPOSE_PROD_ROOT="$ROOT"

if [[ "${CONFIRM:-}" != "YES" ]]; then
  echo "error: set CONFIRM=YES to stop legacy postgres (volume is kept)." >&2
  exit 1
fi

echo "[close-legacy] Taking final legacy postgres backup..."
DB_SERVICE=postgres bash "$ROOT/scripts/backup-prod.sh"

echo "[close-legacy] Stopping legacy postgres container (profile ${COMPOSE_LEGACY_PROFILE})..."
compose_prod_app --profile "$COMPOSE_LEGACY_PROFILE" stop postgres || true

if docker ps -a --format '{{.Names}}' | grep -qx 'pastane_postgres_prod'; then
  state="$(docker inspect -f '{{.State.Status}}' pastane_postgres_prod 2>/dev/null || echo unknown)"
  echo "[close-legacy] pastane_postgres_prod status: ${state}"
else
  echo "[close-legacy] pastane_postgres_prod container not found (already removed)"
fi

echo "[close-legacy] postgres_data volume NOT deleted — remove only after explicit Faz 7.3 approval."
echo "[close-legacy] done."
