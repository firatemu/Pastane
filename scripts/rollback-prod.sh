#!/usr/bin/env bash
# Roll back to a previous IMAGE_TAG by editing .env.prod (or override) and recreating app services.
# Does NOT downgrade the database automatically — pair with migrations policy / restore if needed.
# Usage:
#   IMAGE_TAG=v0.9.0 bash scripts/rollback-prod.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.prod}"
COMPOSE_FILE="${COMPOSE_FILE:-docker/docker-compose.prod.yml}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: $ENV_FILE not found." >&2
  exit 1
fi

if [[ -z "${IMAGE_TAG:-}" ]]; then
  echo "error: set IMAGE_TAG to the previous semver (e.g. IMAGE_TAG=v0.9.0)." >&2
  exit 1
fi

export IMAGE_TAG

echo "Rolling back app images to IMAGE_TAG=$IMAGE_TAG (data plane unchanged)."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d api web admin courier nginx

echo "Rollback recreate issued. Verify health and application behavior."
