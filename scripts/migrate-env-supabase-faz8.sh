#!/usr/bin/env bash
# Migrate VPS .env.production from Faz 7.2 pgAdmin vars to Faz 8.0 Supabase self-host vars.
# Idempotent: skips keys that already exist. Generates missing Supabase secrets.
#
# Usage (on VPS):
#   bash scripts/migrate-env-supabase-faz8.sh [.env.production]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${1:-$ROOT/.env.production}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: $ENV_FILE not found" >&2
  exit 1
fi

get_kv() {
  grep -E "^[[:space:]]*${1}=" "$ENV_FILE" 2>/dev/null | tail -n1 | cut -d= -f2- | sed 's/^"//;s/"$//;s/^'"'"'//;s/'"'"'$//' || true
}

has_key() {
  grep -qE "^[[:space:]]*${1}=" "$ENV_FILE" 2>/dev/null
}

append_kv() {
  local key="$1" val="$2"
  if has_key "$key"; then
    return 0
  fi
  printf '%s=%s\n' "$key" "$val" >> "$ENV_FILE"
  echo "Added $key"
}

# Map legacy pgAdmin studio login → Supabase Dashboard
if ! has_key DASHBOARD_USERNAME; then
  email="$(get_kv SUPABASE_STUDIO_EMAIL)"
  user="${email%%@*}"
  user="${user:-studio-admin}"
  append_kv DASHBOARD_USERNAME "$user"
fi

if ! has_key DASHBOARD_PASSWORD; then
  legacy="$(get_kv SUPABASE_STUDIO_PASSWORD)"
  if [[ -n "${legacy// }" ]]; then
    append_kv DASHBOARD_PASSWORD "$legacy"
  fi
fi

if ! has_key SUPABASE_PUBLIC_URL; then
  append_kv SUPABASE_PUBLIC_URL "https://studio.azem.cloud"
fi

# Generate missing Supabase stack secrets
need_gen=0
for k in SUPABASE_JWT_SECRET SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY SUPABASE_SECRET_KEY_BASE \
  SUPABASE_VAULT_ENC_KEY SUPABASE_PG_META_CRYPTO_KEY SUPABASE_LOGFLARE_PUBLIC_TOKEN SUPABASE_LOGFLARE_PRIVATE_TOKEN; do
  if ! has_key "$k"; then
    need_gen=1
    break
  fi
done

if [[ "$need_gen" == "1" ]]; then
  echo "Generating missing Supabase secrets..."
  tmp="$(mktemp)"
  bash "$ROOT/scripts/generate-supabase-secrets.sh" > "$tmp"
  while IFS= read -r line; do
    [[ "$line" =~ ^# ]] && continue
    [[ -z "${line// }" ]] && continue
    key="${line%%=*}"
    val="${line#*=}"
    append_kv "$key" "$val"
  done < "$tmp"
  rm -f "$tmp"
fi

append_kv SUPABASE_POOLER_TENANT_ID "pastane-prod"
append_kv SUPABASE_STUDIO_ORG "Pastane"
append_kv SUPABASE_STUDIO_PROJECT "Production"

echo "Migration complete. Review $ENV_FILE then: bash scripts/validate-env.sh $ENV_FILE"
