#!/usr/bin/env bash
# Roll back to a previous IMAGE_TAG by pulling that tag from the registry and recreating app services.
# Does NOT downgrade the database automatically — pair with migrations policy / restore if needed.
# Usage:
#   IMAGE_TAG=v0.9.0 bash scripts/rollback-prod.sh
set -euo pipefail

echo '[ROLLBACK TRIGGERED] rollback-prod.sh starting.'

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"

# shellcheck source=scripts/lib/compose-prod.sh
source "$ROOT/scripts/lib/compose-prod.sh"
COMPOSE_PROD_ROOT="$ROOT"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: $ENV_FILE not found." >&2
  exit 1
fi

if [[ -z "${IMAGE_TAG:-}" ]]; then
  echo "error: set IMAGE_TAG to the previous semver (e.g. IMAGE_TAG=v0.9.0)." >&2
  exit 1
fi

export IMAGE_TAG

echo "Ensuring Supabase DB stack is up before app rollback..."
ensure_supabase_db_up

echo "Authenticating to container registry (if configured)..."
docker_login_registry_if_configured

echo "Pulling rollback image tag before recreate..."
compose_prod_app pull api web admin courier

echo "Rolling back app images to IMAGE_TAG=$IMAGE_TAG (data plane unchanged)."
compose_prod_app up -d --no-build api web admin courier

if [[ "${SKIP_POST_DEPLOY_CHECKS:-}" != "1" ]]; then
  echo "Post-rollback health (loopback)..."
  API_HEALTH_URL="http://127.0.0.1:3003/health" bash "$ROOT/scripts/post-deploy-health.sh" || true
fi

echo "Rollback recreate issued. Verify health and application behavior."
