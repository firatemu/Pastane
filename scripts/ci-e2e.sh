#!/usr/bin/env bash
# Brings up docker-compose.dev.yml, waits for readiness, applies migrations + seed,
# then runs Playwright suites via Turborepo.
# Env:
#   E2E_COMPOSE_DOWN=1  — tear the stack down at the end (CI cleanup).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

if [[ ! -f .env ]]; then
  echo "error: .env missing — copy .env.example to .env before e2e (CI does this)." >&2
  exit 1
fi

COMPOSE=(docker compose --env-file .env -f docker/docker-compose.dev.yml)

if [[ "${E2E_COMPOSE_BUILD:-1}" != "0" ]]; then
  echo "[e2e] compose up (--build)"
  "${COMPOSE[@]}" up -d --build
else
  echo "[e2e] compose up (--build skipped via E2E_COMPOSE_BUILD=0)"
  "${COMPOSE[@]}" up -d
fi

cleanup() {
  if [[ "${E2E_COMPOSE_DOWN:-}" == "1" ]]; then
    echo "[e2e] compose down"
    "${COMPOSE[@]}" down --remove-orphans
  fi
}
trap cleanup EXIT

echo "[e2e] waiting for HTTP readiness"
bash scripts/wait-for-http.sh "http://127.0.0.1:3003/health" 120
bash scripts/wait-for-http.sh "http://127.0.0.1:3000/" 120
bash scripts/wait-for-http.sh "http://127.0.0.1:3001/login" 120
bash scripts/wait-for-http.sh "http://127.0.0.1:3002/login" 120

echo "[e2e] prisma migrate deploy (api container)"
"${COMPOSE[@]}" exec -T api sh -lc 'cd /app/packages/database && npx prisma migrate deploy --schema=schema.prisma'

echo "[e2e] prisma seed (api container)"
"${COMPOSE[@]}" exec -T api sh -lc 'cd /app && pnpm --filter @pastane/database prisma:seed'

echo "[e2e] turbo playwright"
pnpm turbo run e2e

echo "[e2e] suites finished OK"
