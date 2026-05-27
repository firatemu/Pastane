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

  echo "[e2e] starting application services"
  if [[ "${E2E_COMPOSE_BUILD:-1}" != "0" ]]; then
    "${COMPOSE[@]}" up -d --build api web admin courier
  else
    "${COMPOSE[@]}" up -d api web admin courier
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
  # In CI prefer container-side readiness checks (runner networking can be flaky).
  wait_for_node_fetch() {
    local service="${1:?service required}"
    local url="${2:?url required}"
    local attempt=1
    local max_attempts=90
    while (( attempt <= max_attempts )); do
      if "${COMPOSE[@]}" exec -T "${service}" node -e "
        fetch('${url}', { redirect: 'follow' })
          .then(r => { if (r.ok) process.exit(0); console.error('HTTP', r.status); process.exit(1); })
          .catch(err => { console.error(String(err)); process.exit(1); });
      " >/dev/null 2>&1; then
        echo \"healthy(${service}): ${url}\"
        return 0
      fi
      sleep 2
      attempt=$((attempt + 1))
    done
    echo \"::error::timeout waiting for ${service} ${url}\" >&2
    return 1
  }

  wait_for_node_fetch api "http://localhost:3003/health"
  wait_for_node_fetch web "http://localhost:3000/"
  wait_for_node_fetch admin "http://localhost:3001/login"
  wait_for_node_fetch courier "http://localhost:3002/login"
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
pnpm turbo run e2e

echo "[e2e] suites finished OK"
