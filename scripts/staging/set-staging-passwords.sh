#!/usr/bin/env bash
# Set one bcrypt hash for all staging users after sanitize (default: StagingTest123!)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.staging}"
COMPOSE_SUPABASE="${COMPOSE_SUPABASE:-docker/docker-compose.supabase.staging.yml}"
PROJECT_SUPABASE="${PROJECT_SUPABASE:-supabase-staging}"
PASSWORD="${STAGING_DEFAULT_PASSWORD:-StagingTest123!}"

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

DB_USER="${STAGING_POSTGRES_USER:-$POSTGRES_USER}"
DB_NAME="${STAGING_POSTGRES_DB:-$POSTGRES_DB}"

hash_password() {
  local plain="$1"
  if command -v node >/dev/null 2>&1; then
    node -e "const {hashSync}=require('bcryptjs'); process.stdout.write(hashSync(process.argv[1],12));" "$plain"
  elif python3 -c "import bcrypt" >/dev/null 2>&1; then
    python3 -c "import bcrypt, sys; print(bcrypt.hashpw(sys.argv[1].encode(), bcrypt.gensalt(12)).decode())" "$plain"
  else
    echo "error: need node or python3+bcrypt to hash staging passwords" >&2
    exit 1
  fi
}

HASH=$(hash_password "$PASSWORD")

docker compose --project-name "$PROJECT_SUPABASE" --env-file "$ENV_FILE" -f "$COMPOSE_SUPABASE" \
  exec -T supabase-db psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c \
  "UPDATE \"users\" SET \"passwordHash\" = '${HASH}';"

echo "All staging users password set to: ${PASSWORD}"
echo "Smoke phones: admin 905559000001 | customer 905559000010 | courier 905559000004"
