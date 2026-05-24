#!/usr/bin/env bash
# Write pgpass for pgAdmin from POSTGRES_PASSWORD (called by supabase-studio entrypoint).
set -euo pipefail
: "${POSTGRES_USER:?POSTGRES_USER required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}"
: "${POSTGRES_DB:=pastane_db}"
PGPASS="/var/lib/pgadmin/.pgpass"
mkdir -p /var/lib/pgadmin
printf '%s:5432:%s:%s:%s\n' "supabase-db" "$POSTGRES_DB" "$POSTGRES_USER" "$POSTGRES_PASSWORD" > "$PGPASS"
chmod 600 "$PGPASS"
chown pgadmin:pgadmin "$PGPASS" 2>/dev/null || true
exec /entrypoint.sh "$@"
