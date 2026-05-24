#!/usr/bin/env bash
# Loads monorepo root .env then runs prisma with packages/database/schema.prisma.
# From the host (not inside Docker), rewrites @postgres: → @127.0.0.1: so Compose-style DATABASE_URL works (published port).
# Opt out (same as seed): DATABASE_URL_SEED=preserve or put 127.0.0.1 in DATABASE_URL yourself.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${PKG_ROOT}/../.." && pwd)"

cd "${PKG_ROOT}"

set -a
if [[ -f "${REPO_ROOT}/.env" ]]; then
  # shellcheck source=/dev/null
  . "${REPO_ROOT}/.env"
fi
set +a

if [[ ! -f /.dockerenv ]] && [[ "${DATABASE_URL_SEED:-}" != preserve ]]; then
  for var in DATABASE_URL DIRECT_URL; do
    if [[ -n "${!var:-}" ]]; then
      # Compose legacy hostname or Docker override → loopback for host-side Prisma CLI.
      export "${var}=${!var//@postgres:/@127.0.0.1:}"
      export "${var}=${!var//@host.docker.internal:/@127.0.0.1:}"
    fi
  done
fi

exec pnpm exec prisma "$@" --schema=schema.prisma
