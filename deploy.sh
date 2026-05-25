#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/var/www/pastane-app/app}"
if [[ ! -d "$APP_DIR/.git" ]]; then
  APP_DIR="$(cd "$(dirname "$0")" && pwd)"
fi

cd "$APP_DIR"

ENV_FILE="${ENV_FILE:-.env.production}"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-pastane-prod}"
CURRENT_TAG_FILE="$APP_DIR/.pastane-deploy-current-tag"
PREVIOUS_TAG_FILE="$APP_DIR/.pastane-deploy-previous-tag"

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

RESOLVED_REGISTRY="$(resolve_prod_runtime_value REGISTRY)"
RESOLVED_IMAGE_TAG="$(resolve_prod_runtime_value IMAGE_TAG)"

if [[ -z "${RESOLVED_REGISTRY// }" ]]; then
  echo "error: REGISTRY must be set via environment or ${ENV_FILE}." >&2
  exit 1
fi

if [[ -z "${RESOLVED_IMAGE_TAG// }" ]]; then
  echo "error: IMAGE_TAG must be set via environment or ${ENV_FILE}." >&2
  exit 1
fi

export REGISTRY="$RESOLVED_REGISTRY"
export IMAGE_TAG="$RESOLVED_IMAGE_TAG"

echo "Deploying Pastane from $APP_DIR"
echo "Target registry: ${REGISTRY}"
echo "Target image tag: ${IMAGE_TAG}"
GIT_REF="${DEPLOY_GIT_REF:-main}"

sync_git_checkout() {
  echo "Syncing repository to deploy ref: ${GIT_REF}"
  git fetch --tags origin

  if git show-ref --verify --quiet "refs/remotes/origin/${GIT_REF}"; then
    if [[ "${DEPLOY_NO_HARD_RESET:-}" == "1" ]]; then
      git checkout "$GIT_REF"
      git pull --ff-only origin "$GIT_REF"
    else
      git checkout -B "$GIT_REF" "origin/$GIT_REF"
      git reset --hard "origin/$GIT_REF"
    fi
    return 0
  fi

  if ! git rev-parse --verify --quiet "${GIT_REF}^{commit}" >/dev/null; then
    echo "error: deploy git ref '${GIT_REF}' was not found after fetching origin." >&2
    exit 1
  fi

  git checkout --detach "$GIT_REF"
  if [[ "${DEPLOY_NO_HARD_RESET:-}" != "1" ]]; then
    git reset --hard "$GIT_REF"
  fi
}

sync_git_checkout

# Keep the VPS tree identical to GitHub. Uncommitted edits here break merges and belong in Git, not on the server.
# Override only if you know you need legacy behaviour: DEPLOY_NO_HARD_RESET=1 ./deploy.sh (pull --ff-only; fails when dirty).
CID="$(compose_prod_app ps -q api 2>/dev/null || true)"
if [[ -n "$CID" ]]; then
  PREV_IMG="$(docker inspect -f '{{.Config.Image}}' "$CID" 2>/dev/null || echo '')"
  if [[ -n "$PREV_IMG" ]]; then
    PREV_TAG="${PREV_IMG##*:}"
    printf '%s\n' "$PREV_TAG" > "$PREVIOUS_TAG_FILE"
    echo "Recorded previous api image tag: $PREV_TAG"
  fi
else
  PREV_FALLBACK=""
  if [[ -f "$CURRENT_TAG_FILE" ]]; then
    PREV_FALLBACK="$(tr -d '\r\n' < "$CURRENT_TAG_FILE")"
  fi
  if [[ -z "${PREV_FALLBACK// }" ]]; then
    PREV_FALLBACK="$(read_prod_env_value IMAGE_TAG)"
  fi
  if [[ -n "${PREV_FALLBACK// /}" ]]; then
    printf '%s\n' "$PREV_FALLBACK" > "$PREVIOUS_TAG_FILE"
    echo "No running api container; recorded fallback image tag for rollback: ${PREV_FALLBACK}"
  fi
fi

ensure_supabase_db_up

if studio_enabled; then
  echo "Supabase Studio included in supabase-prod stack (127.0.0.1:54323)"
fi

echo "Validating compose config..."
compose_prod_app config >/dev/null

echo "Authenticating to container registry (if configured)..."
docker_login_registry_if_configured

echo "Pulling application images..."
compose_prod_app pull api web admin courier

echo "Starting services from pulled images..."
compose_prod_app up -d --no-build api web admin courier

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

printf '%s\n' "$IMAGE_TAG" > "$CURRENT_TAG_FILE"
echo "Recorded current image tag: $IMAGE_TAG"

echo "Pruning unused Docker images..."
docker image prune -f

echo "Deploy finished."
