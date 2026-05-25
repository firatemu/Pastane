#!/usr/bin/env bash
# Shared production Docker Compose paths — source from deploy/backup/restore/rollback scripts.
# Usage: source "$(dirname "$0")/lib/compose-prod.sh"   (adjust path as needed)

COMPOSE_PROD_ROOT="${COMPOSE_PROD_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
COMPOSE_PROD_FILE="${COMPOSE_PROD_FILE:-docker/docker-compose.prod.yml}"
COMPOSE_SUPABASE_FILE="${COMPOSE_SUPABASE_FILE:-docker/docker-compose.supabase.prod.yml}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-pastane-prod}"
SUPABASE_PROJECT_NAME="${SUPABASE_PROJECT_NAME:-supabase-prod}"
COMPOSE_LEGACY_PROFILE="${COMPOSE_LEGACY_PROFILE:-legacy-db}"
SUPABASE_RUNTIME_ENV="${SUPABASE_RUNTIME_ENV:-docker/supabase/.runtime.env}"

compose_prod() {
  docker compose --project-name "$COMPOSE_PROJECT_NAME" "$@"
}

compose_prod_app() {
  compose_prod --env-file "${ENV_FILE:-.env.production}" -f "$COMPOSE_PROD_FILE" "$@"
}

read_prod_env_value() {
  local key="$1"
  local file="${ENV_FILE:-.env.production}"
  local value

  if [[ ! -f "$file" ]]; then
    return 0
  fi

  value="$(grep -E "^[[:space:]]*${key}=" "$file" 2>/dev/null | tail -n1 | cut -d= -f2- || true)"
  value="${value%$'\r'}"
  value="${value#\"}"
  value="${value%\"}"
  value="${value#\'}"
  value="${value%\'}"
  printf '%s' "$value"
}

resolve_prod_runtime_value() {
  local key="$1"
  local value="${!key:-}"

  if [[ -n "${value// }" ]]; then
    printf '%s' "$value"
    return 0
  fi

  read_prod_env_value "$key"
}

infer_registry_server() {
  local registry="$1"
  local first_segment

  first_segment="${registry%%/*}"
  if [[ "$registry" == */* ]] && [[ "$first_segment" == *.* || "$first_segment" == *:* || "$first_segment" == "localhost" ]]; then
    printf '%s' "$first_segment"
  fi
}

docker_login_registry_if_configured() {
  local registry server username password

  registry="$(resolve_prod_runtime_value REGISTRY)"
  server="$(resolve_prod_runtime_value REGISTRY_SERVER)"
  username="$(resolve_prod_runtime_value REGISTRY_USERNAME)"
  password="$(resolve_prod_runtime_value REGISTRY_PASSWORD)"

  if [[ -z "${server// }" ]] && [[ -n "${registry// }" ]]; then
    server="$(infer_registry_server "$registry")"
  fi

  if [[ -z "${username// }" && -z "${password// }" ]]; then
    if [[ -n "${server// }" ]]; then
      echo "No registry credentials configured for ${server}; continuing without docker login."
    fi
    return 0
  fi

  if [[ -z "${server// }" || -z "${username// }" || -z "${password// }" ]]; then
    echo "error: REGISTRY_SERVER, REGISTRY_USERNAME, and REGISTRY_PASSWORD must all be set for authenticated registry access." >&2
    return 1
  fi

  printf '%s' "$password" | docker login "$server" --username "$username" --password-stdin >/dev/null
  echo "Docker registry login succeeded for ${server}."
}

supabase_compose_files() {
  printf '%s\n' \
    "$COMPOSE_PROD_ROOT/docker/supabase/docker-compose.yml" \
    "$COMPOSE_PROD_ROOT/docker/supabase/docker-compose.pg17.yml" \
    "$COMPOSE_PROD_ROOT/docker/supabase/docker-compose.pastane.prod.yml"
}

ensure_supabase_runtime_env() {
  bash "$COMPOSE_PROD_ROOT/scripts/generate-supabase-compose-env.sh" \
    "${ENV_FILE:-.env.production}" \
    "$COMPOSE_PROD_ROOT/$SUPABASE_RUNTIME_ENV"
}

compose_supabase() {
  ensure_supabase_runtime_env
  local -a files=()
  local f
  while IFS= read -r f; do
    files+=(-f "$f")
  done < <(supabase_compose_files)
  docker compose --project-name "$SUPABASE_PROJECT_NAME" \
    --env-file "$COMPOSE_PROD_ROOT/$SUPABASE_RUNTIME_ENV" \
    "${files[@]}" "$@"
}

wait_supabase_db_healthy() {
  local tries="${SUPABASE_DB_HEALTH_TRIES:-90}"
  local delay="${SUPABASE_DB_HEALTH_DELAY_SEC:-3}"
  local i cid status

  for ((i = 1; i <= tries; i++)); do
    if compose_supabase exec -T db pg_isready -U postgres -d postgres >/dev/null 2>&1; then
      cid="$(compose_supabase ps -q db 2>/dev/null | tr -d '\r' | awk 'NF { id=$0 } END { print id }')"
      status="unknown"
      if [[ -n "$cid" ]]; then
        status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}' "$cid" 2>/dev/null || echo 'unknown')"
      fi
      case "$status" in
        healthy | unknown | starting | '')
          echo "supabase db ready (pg_isready, health=${status:-n/a})"
          return 0
          ;;
        unhealthy)
          echo "warning: supabase db pg_isready OK but Docker health=unhealthy; continuing" >&2
          return 0
          ;;
      esac
    fi
    echo "waiting for supabase db (${i}/${tries})..."
    sleep "$delay"
  done

  echo "error: supabase db did not become ready within ${tries} attempts" >&2
  return 1
}

ensure_supabase_db_up() {
  ensure_supabase_stack_up
}

ensure_supabase_stack_up() {
  echo "Ensuring full Supabase stack (supabase-prod)..."
  if ! docker network inspect pastane_supabase >/dev/null 2>&1; then
    docker network create pastane_supabase
  fi
  compose_supabase up -d
  wait_supabase_db_healthy
  if studio_enabled; then
    wait_supabase_studio_http
  fi
}

studio_enabled() {
  local flag
  flag="$(grep -E '^[[:space:]]*SUPABASE_STUDIO_ENABLED=' "${ENV_FILE:-.env.production}" 2>/dev/null | tail -n1 | cut -d= -f2- | tr -d '[:space:]"'"'"'')"
  if [[ -z "$flag" ]]; then
    flag="${SUPABASE_STUDIO_ENABLED:-1}"
  fi
  [[ "$flag" == "1" || "$flag" == "true" || "$flag" == "yes" ]]
}

wait_supabase_studio_http() {
  local tries="${SUPABASE_STUDIO_HEALTH_TRIES:-60}"
  local delay="${SUPABASE_STUDIO_HEALTH_DELAY_SEC:-3}"
  local i code

  for ((i = 1; i <= tries; i++)); do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:54323/ 2>/dev/null || echo 000)"
    if [[ "$code" =~ ^(200|301|302|307)$ ]]; then
      echo "supabase studio HTTP OK (${code})"
      return 0
    fi
    echo "waiting for supabase studio (${i}/${tries}, HTTP ${code})..."
    sleep "$delay"
  done

  echo "error: supabase studio did not respond on 127.0.0.1:54323" >&2
  return 1
}

ensure_supabase_studio_up() {
  if ! studio_enabled; then
    echo "SUPABASE_STUDIO_ENABLED is off — skipping studio"
    return 0
  fi
  ensure_supabase_stack_up
}

# Legacy service name alias — backup/restore scripts use supabase-db
supabase_db_service() {
  echo "db"
}
