#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/var/www/pastane-app/app}"
if [[ ! -d "$APP_DIR/.git" ]]; then
  APP_DIR="$(cd "$(dirname "$0")" && pwd)"
fi

cd "$APP_DIR"

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker/docker-compose.prod.yml}"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-pastane-prod}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: $ENV_FILE not found. Copy .env.production.example to .env.production and fill production secrets." >&2
  exit 1
fi

if grep -qE 'change_me|placeholder' "$ENV_FILE"; then
  echo "error: $ENV_FILE still contains placeholder values. Replace secrets before production deploy." >&2
  exit 1
fi

echo "Deploying Pastane from $APP_DIR"
GIT_REF="${DEPLOY_GIT_REF:-main}"
git fetch origin "$GIT_REF"
git checkout "$GIT_REF"

# Keep the VPS tree identical to GitHub. Uncommitted edits here break merges and belong in Git, not on the server.
# Override only if you know you need legacy behaviour: DEPLOY_NO_HARD_RESET=1 ./deploy.sh (pull --ff-only; fails when dirty).
if [[ "${DEPLOY_NO_HARD_RESET:-}" == "1" ]]; then
  git pull --ff-only origin "$GIT_REF"
else
  git reset --hard "origin/$GIT_REF"
fi

echo "Validating compose config..."
docker compose --project-name "$PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config >/dev/null

echo "Building production images..."
docker compose --project-name "$PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build

echo "Starting services..."
docker compose --project-name "$PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d

echo "Running Prisma migrate deploy..."
docker compose --project-name "$PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T api \
  sh -lc 'cd /app/packages/database && npx prisma migrate deploy --schema=schema.prisma'

echo "Service status:"
docker compose --project-name "$PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

echo "Recent logs:"
docker compose --project-name "$PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=80 api web admin courier

echo "Pruning unused Docker images..."
docker image prune -f

echo "Deploy finished."
