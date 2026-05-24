#!/usr/bin/env bash
# Verify pnpm-lock.yaml matches package.json files copied in production Dockerfiles.
# Fails in CI/VPS before a long docker compose build when lockfile drift would break --frozen-lockfile.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== verify-docker-lockfile ==="

if ! command -v pnpm >/dev/null 2>&1; then
  echo "[skip] pnpm not on host — Docker prod build (--frozen-lockfile) is authoritative"
  exit 0
fi

echo "[1/5] root frozen-lockfile"
pnpm install --frozen-lockfile >/dev/null

verify_filter() {
  local label="$1"
  shift
  echo "[filter] ${label}"
  pnpm install --frozen-lockfile "$@" >/dev/null
}

echo "[2/5] api + database (Dockerfile.api.prod)"
verify_filter "api" --filter @pastane/api... --filter @pastane/database...

echo "[3/5] web (Dockerfile.web.prod)"
verify_filter "web" --filter @pastane/web...

echo "[4/5] admin (Dockerfile.admin.prod)"
verify_filter "admin" --filter @pastane/admin...

echo "[5/5] courier (Dockerfile.courier.prod)"
verify_filter "courier" --filter @pastane/courier...

echo "verify-docker-lockfile: OK"
