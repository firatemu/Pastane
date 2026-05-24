#!/usr/bin/env bash
# Validates a production-like .env file: required keys present, PAYMENT_DEV_AUTO_SUCCESS never true when NODE_ENV=production.
# Does not echo secret values.
# Usage: scripts/validate-env.sh [ENV_FILE]
# Default ENV_FILE: .env.production
set -euo pipefail

ENV_FILE="${1:-.env.production}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "validate-env: file not found: $ENV_FILE" >&2
  exit 2
fi

# Read LAST assignment for KEY= (bash-like; ignores duplicates)
get_kv() {
  local key="$1"
  grep -E "^[[:space:]]*${key}=" "$ENV_FILE" 2>/dev/null | tail -n1 | cut -d= -f2- | sed 's/^"//;s/"$//;s/^'"'"'//;s/'"'"'$//' || true
}

is_blank() {
  local v="$1"
  [[ -z "${v// }" ]]
}

require_nonblank() {
  local key="$1"
  local v
  v=$(get_kv "$key")
  if is_blank "$v"; then
    echo "validate-env: missing or empty ${key} in $ENV_FILE" >&2
    exit 1
  fi
}

require_nonblank DATABASE_URL
require_nonblank DIRECT_URL
require_nonblank JWT_SECRET
require_nonblank JWT_REFRESH_SECRET
require_nonblank IYZICO_API_KEY
require_nonblank IYZICO_SECRET_KEY
require_nonblank MINIO_ACCESS_KEY
require_nonblank MINIO_SECRET_KEY

postgres_host=$(get_kv POSTGRES_HOST)
database_url=$(get_kv DATABASE_URL)
direct_url=$(get_kv DIRECT_URL)

if [[ "$postgres_host" != "supabase-db" ]]; then
  echo "validate-env: POSTGRES_HOST must be supabase-db in $ENV_FILE (got: ${postgres_host:-<empty>})." >&2
  echo "validate-env: for legacy DB rollback during the 7-day window, use docs/supabase-legacy-rollback-window.md" >&2
  exit 1
fi

if [[ "$database_url" != *"@supabase-db:"* ]]; then
  echo "validate-env: DATABASE_URL must target supabase-db in $ENV_FILE." >&2
  exit 1
fi

if [[ "$direct_url" != *"@supabase-db:"* ]]; then
  echo "validate-env: DIRECT_URL must target supabase-db in $ENV_FILE (required for prisma migrate deploy)." >&2
  exit 1
fi

if [[ "$database_url" == *"@postgres:"* ]] || [[ "$direct_url" == *"@postgres:"* ]]; then
  echo "validate-env: DATABASE_URL/DIRECT_URL must not use legacy @postgres host in normal production deploy." >&2
  exit 1
fi

minio_endpoint=$(get_kv MINIO_ENDPOINT)
minio_public_url=$(get_kv MINIO_PUBLIC_URL)
if is_blank "$minio_endpoint" && is_blank "$minio_public_url"; then
  echo "validate-env: set MINIO_ENDPOINT or MINIO_PUBLIC_URL (MinIO reachable config) in $ENV_FILE" >&2
  exit 1
fi

pay_dev=$(get_kv PAYMENT_DEV_AUTO_SUCCESS)
if [[ "$pay_dev" == "true" ]]; then
  echo "[CRITICAL] PAYMENT_DEV_AUTO_SUCCESS must not be true in $ENV_FILE (production deployment validation)." >&2
  exit 1
fi

studio_enabled="$(get_kv SUPABASE_STUDIO_ENABLED)"
if [[ -z "${studio_enabled// }" ]]; then
  studio_enabled="1"
fi
if [[ "$studio_enabled" == "1" || "$studio_enabled" == "true" || "$studio_enabled" == "yes" ]]; then
  require_nonblank SUPABASE_PUBLIC_URL
  require_nonblank DASHBOARD_USERNAME
  require_nonblank DASHBOARD_PASSWORD
  require_nonblank SUPABASE_JWT_SECRET
  require_nonblank SUPABASE_ANON_KEY
  require_nonblank SUPABASE_SERVICE_ROLE_KEY
  require_nonblank SUPABASE_SECRET_KEY_BASE
  require_nonblank SUPABASE_VAULT_ENC_KEY
  require_nonblank SUPABASE_PG_META_CRYPTO_KEY
  require_nonblank SUPABASE_LOGFLARE_PUBLIC_TOKEN
  require_nonblank SUPABASE_LOGFLARE_PRIVATE_TOKEN

  dashboard_pass=$(get_kv DASHBOARD_PASSWORD)
  if [[ "$dashboard_pass" == *change_me* ]] || [[ "$dashboard_pass" == *placeholder* ]]; then
    echo "validate-env: DASHBOARD_PASSWORD must not be a placeholder in $ENV_FILE" >&2
    exit 1
  fi
  if [[ ${#dashboard_pass} -lt 20 ]]; then
    echo "validate-env: DASHBOARD_PASSWORD should be at least 20 characters in $ENV_FILE" >&2
    exit 1
  fi

  supabase_jwt=$(get_kv SUPABASE_JWT_SECRET)
  pastane_jwt=$(get_kv JWT_SECRET)
  if [[ "$supabase_jwt" == "$pastane_jwt" ]]; then
    echo "validate-env: SUPABASE_JWT_SECRET must differ from Pastane JWT_SECRET in $ENV_FILE" >&2
    exit 1
  fi
fi

echo "validate-env: OK ($ENV_FILE)"
