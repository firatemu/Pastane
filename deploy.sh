#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/var/www/pastane-app/app}"
if [[ ! -d "$APP_DIR/.git" ]]; then
  APP_DIR="$(cd "$(dirname "$0")" && pwd)"
fi

cd "$APP_DIR"

ENV_FILE="${ENV_FILE:-.env.production}"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-pastane-prod}"

# shellcheck source=scripts/lib/compose-prod.sh
source "$APP_DIR/scripts/lib/compose-prod.sh"
COMPOSE_PROD_ROOT="$APP_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: $ENV_FILE not found. Copy .env.production.example to .env.production and fill production secrets." >&2
  exit 1
fi

if grep -qE 'change_me|placeholder' "$ENV_FILE"; then
  echo "error: $ENV_FILE still contains placeholder values. Replace secrets before production deploy." >&2
  exit 1
fi

echo "Validating required production env variables..."
bash "$APP_DIR/scripts/validate-env.sh" "$ENV_FILE"

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

CID="$(compose_prod_app ps -q api 2>/dev/null || true)"
if [[ -n "$CID" ]]; then
  PREV_IMG="$(docker inspect -f '{{.Config.Image}}' "$CID" 2>/dev/null || echo '')"
  if [[ -n "$PREV_IMG" ]]; then
    PREV_TAG="${PREV_IMG##*:}"
    printf '%s\n' "$PREV_TAG" > "$APP_DIR/.pastane-deploy-previous-tag"
    echo "Recorded previous api image tag: $PREV_TAG"
  fi
else
  PREV_FALLBACK="$(grep -E '^[[:space:]]*IMAGE_TAG=' "$ENV_FILE" | tail -n1 | cut -d= -f2-)"
  if [[ -n "${PREV_FALLBACK// /}" ]]; then
    printf '%s\n' "$PREV_FALLBACK" > "$APP_DIR/.pastane-deploy-previous-tag"
    echo "No running api container; recorded IMAGE_TAG from env file for rollback fallback: ${PREV_FALLBACK}"
  fi
fi

ensure_supabase_db_up

if studio_enabled; then
  ensure_supabase_studio_up
fi

echo "Validating compose config..."
compose_prod_app config >/dev/null

echo "Building production images..."
compose_prod_app build

echo "Starting services..."
compose_prod_app up -d

echo "Running Prisma migrate deploy..."
compose_prod_app exec -T api \
  sh -lc 'cd /app/packages/database && npx prisma migrate deploy --schema=schema.prisma'

echo "Service status:"
compose_prod_app ps

echo "Recent logs:"
compose_prod_app logs --tail=80 api web admin courier

if [[ "${SKIP_POST_DEPLOY_CHECKS:-}" != "1" ]]; then
  echo "Post-deploy health (loopback)..."
  API_HEALTH_URL="http://127.0.0.1:3003/health" \
    API_HEALTH_TRIES="${API_HEALTH_TRIES:-30}" \
    API_HEALTH_DELAY_SEC="${API_HEALTH_DELAY_SEC:-5}" \
    bash "$APP_DIR/scripts/post-deploy-health.sh"

  echo "Post-deploy smoke (public read-only)..."
  PROD_API_URL="${PROD_API_URL:-http://127.0.0.1:3003}" \
    ENV_FILE="$ENV_FILE" \
    bash "$APP_DIR/scripts/post-deploy-smoke-prod.sh"
fi

echo "Pruning unused Docker images..."
docker image prune -f

echo "Deploy finished."
