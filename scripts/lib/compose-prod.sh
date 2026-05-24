#!/usr/bin/env bash
# Shared production Docker Compose paths — source from deploy/backup/restore/rollback scripts.
# Usage: source "$(dirname "$0")/lib/compose-prod.sh"   (adjust path as needed)

COMPOSE_PROD_ROOT="${COMPOSE_PROD_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
COMPOSE_PROD_FILE="${COMPOSE_PROD_FILE:-docker/docker-compose.prod.yml}"
COMPOSE_SUPABASE_FILE="${COMPOSE_SUPABASE_FILE:-docker/docker-compose.supabase.prod.yml}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-pastane-prod}"
SUPABASE_PROJECT_NAME="${SUPABASE_PROJECT_NAME:-supabase-prod}"
COMPOSE_LEGACY_PROFILE="${COMPOSE_LEGACY_PROFILE:-legacy-db}"

compose_prod() {
  docker compose --project-name "$COMPOSE_PROJECT_NAME" "$@"
}

compose_prod_app() {
  compose_prod --env-file "${ENV_FILE:-.env.production}" -f "$COMPOSE_PROD_FILE" "$@"
}

compose_supabase() {
  docker compose --project-name "$SUPABASE_PROJECT_NAME" --env-file "${ENV_FILE:-.env.production}" \
    -f "$COMPOSE_SUPABASE_FILE" "$@"
}

wait_supabase_db_healthy() {
  local tries="${SUPABASE_DB_HEALTH_TRIES:-30}"
  local delay="${SUPABASE_DB_HEALTH_DELAY_SEC:-2}"
  local i cid status

  for ((i = 1; i <= tries; i++)); do
    cid="$(compose_supabase ps -q supabase-db 2>/dev/null || true)"
    if [[ -n "$cid" ]]; then
      status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}' "$cid" 2>/dev/null || echo '')"
      if [[ "$status" == "healthy" ]]; then
        echo "supabase-db healthy"
        return 0
      fi
    fi
    echo "waiting for supabase-db (${i}/${tries}, status=${status:-starting})..."
    sleep "$delay"
  done

  echo "error: supabase-db did not become healthy within ${tries} attempts" >&2
  return 1
}

ensure_supabase_db_up() {
  echo "Ensuring Supabase DB stack (supabase-prod) is up..."
  compose_supabase up -d supabase-db
  wait_supabase_db_healthy
}
