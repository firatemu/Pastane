#!/usr/bin/env bash
# Brings up docker-compose.dev.yml, waits for readiness, applies migrations + seed,
# then runs Playwright suites via Turborepo.
# Env:
#   E2E_COMPOSE_DOWN=1  — tear the stack down at the end (CI cleanup).
#   E2E_USE_CI_COMPOSE=1 — force CI postgres stack locally (same as CI=true).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

if [[ ! -f .env ]]; then
  echo "error: .env missing — copy .env.example to .env before e2e (CI does this)." >&2
  exit 1
fi

COMPOSE=(docker compose --env-file .env -f docker/docker-compose.dev.yml)
CI_MODE=0
if [[ "${CI:-}" == "true" || "${E2E_USE_CI_COMPOSE:-}" == "1" ]]; then
  CI_MODE=1
fi

if [[ "${CI_MODE}" -eq 1 ]]; then
  echo "[e2e] CI mode: Compose postgres (legacy-db profile), not Supabase CLI"
  COMPOSE=(
    docker compose --env-file .env
    --project-name pastane-ci-e2e
    -f docker/docker-compose.dev.yml
    -f docker/docker-compose.ci.yml
    --profile legacy-db
  )
fi

cleanup() {
  if [[ "${E2E_COMPOSE_DOWN:-}" == "1" ]]; then
    echo "[e2e] compose down"
    if [[ "${CI_MODE}" -eq 1 ]]; then
      "${COMPOSE[@]}" down -v --remove-orphans
    else
      "${COMPOSE[@]}" down --remove-orphans
    fi
  fi
}
trap cleanup EXIT

echo "[e2e] validating compose project"
"${COMPOSE[@]}" config >/dev/null

wait_for_postgres() {
  local attempt=1
  local max_attempts=60
  while (( attempt <= max_attempts )); do
    if "${COMPOSE[@]}" exec -T postgres pg_isready -U postgres -d postgres >/dev/null 2>&1; then
      echo "postgres ready"
      return 0
    fi
    sleep 2
    attempt=$((attempt + 1))
  done
  echo "::error::timeout waiting for postgres" >&2
  return 1
}

run_prisma_bootstrap() {
  echo "[e2e] prisma migrate deploy"
  "${COMPOSE[@]}" run --rm --no-deps api sh -lc \
    'cd /app/packages/database && npx prisma migrate deploy --schema=schema.prisma'

  echo "[e2e] prisma seed"
  "${COMPOSE[@]}" run --rm --no-deps api sh -lc \
    'cd /app && pnpm --filter @pastane/database prisma:seed'
}

dump_service_logs() {
  local service="${1:?service required}"
  echo "[e2e] --- ${service} logs (tail 120) ---" >&2
  "${COMPOSE[@]}" logs --tail=120 "${service}" >&2 || true
}

if [[ "${CI_MODE}" -eq 1 ]]; then
  echo "[e2e] resetting CI volumes"
  "${COMPOSE[@]}" down -v --remove-orphans 2>/dev/null || true

  echo "[e2e] starting infrastructure (postgres, redis, minio)"
  if [[ "${E2E_COMPOSE_BUILD:-1}" != "0" ]]; then
    "${COMPOSE[@]}" up -d --build postgres redis minio
  else
    "${COMPOSE[@]}" up -d postgres redis minio
  fi

  wait_for_postgres

  echo "[e2e] building api image for migrations"
  "${COMPOSE[@]}" build api

  run_prisma_bootstrap

  echo "[e2e] starting application services (wait for healthchecks)"
  compose_up_app=(up -d --wait --wait-timeout 1200)
  if [[ "${E2E_COMPOSE_BUILD:-1}" != "0" ]]; then
    compose_up_app+=(--build)
  fi
  compose_up_app+=(api web admin courier)
  if ! "${COMPOSE[@]}" "${compose_up_app[@]}"; then
    echo "::error::application services did not become healthy in time" >&2
    for svc in api web admin courier; do
      dump_service_logs "${svc}"
    done
    exit 1
  fi
else
  if [[ "${E2E_COMPOSE_BUILD:-1}" != "0" ]]; then
    echo "[e2e] compose up (--build)"
    "${COMPOSE[@]}" up -d --build
  else
    echo "[e2e] compose up (--build skipped via E2E_COMPOSE_BUILD=0)"
    "${COMPOSE[@]}" up -d
  fi
fi

echo "[e2e] waiting for HTTP readiness"
if [[ "${CI_MODE}" -eq 1 ]]; then
  # Compose --wait uses container healthchecks; confirm host ports for Playwright.
  wait_for_host_http() {
    local url="${1:?url required}"
    local label="${2:-${url}}"
    if bash scripts/wait-for-http.sh "${url}" 180; then
      echo "healthy(host): ${label}"
      return 0
    fi
    echo "::error::host could not reach ${label}" >&2
    return 1
  }

  if ! wait_for_host_http "http://127.0.0.1:3003/health" "api"; then
    dump_service_logs api
    exit 1
  fi
  if ! wait_for_host_http "http://127.0.0.1:3000/" "web"; then
    dump_service_logs web
    exit 1
  fi
  if ! wait_for_host_http "http://127.0.0.1:3001/login" "admin"; then
    dump_service_logs admin
    exit 1
  fi
  if ! wait_for_host_http "http://127.0.0.1:3002/login" "courier"; then
    dump_service_logs courier
    exit 1
  fi
else
  bash scripts/wait-for-http.sh "http://127.0.0.1:3003/health" 180
  bash scripts/wait-for-http.sh "http://127.0.0.1:3000/" 180
  bash scripts/wait-for-http.sh "http://127.0.0.1:3001/login" 180
  bash scripts/wait-for-http.sh "http://127.0.0.1:3002/login" 180
fi

if [[ "${CI_MODE}" -eq 0 ]]; then
  echo "[e2e] prisma migrate deploy (api container)"
  "${COMPOSE[@]}" exec -T api sh -lc 'cd /app/packages/database && npx prisma migrate deploy --schema=schema.prisma'

  echo "[e2e] prisma seed (api container)"
  "${COMPOSE[@]}" exec -T api sh -lc 'cd /app && pnpm --filter @pastane/database prisma:seed'
fi

echo "[e2e] turbo playwright"
if [[ "${CI_MODE}" -eq 1 ]]; then
  # Serial suites reduce CPU contention on GitHub-hosted runners (2 vCPU).
  pnpm turbo run e2e --concurrency=1
else
  pnpm turbo run e2e
fi

echo "[e2e] suites finished OK"
