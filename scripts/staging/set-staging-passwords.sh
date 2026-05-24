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

HASH=$(node -e "const {hashSync}=require('bcryptjs'); process.stdout.write(hashSync(process.argv[1],12));" "$PASSWORD")

docker compose --project-name "$PROJECT_SUPABASE" --env-file "$ENV_FILE" -f "$COMPOSE_SUPABASE" \
  exec -T supabase-db psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c \
  "UPDATE \"users\" SET \"passwordHash\" = '${HASH}';"

echo "All staging users password set to: ${PASSWORD}"
echo "Smoke phones: admin 905559000001 | customer 905559000010 | courier 905559000004"
