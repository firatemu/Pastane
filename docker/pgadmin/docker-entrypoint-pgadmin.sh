#!/usr/bin/env bash
# Write pgpass for pgAdmin from POSTGRES_PASSWORD (called by supabase-studio entrypoint).
set -euo pipefail
: "${POSTGRES_USER:?POSTGRES_USER required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}"
: "${POSTGRES_DB:=pastane_db}"
printf '%s:5432:%s:%s:%s\n' "supabase-db" "$POSTGRES_DB" "$POSTGRES_USER" "$POSTGRES_PASSWORD" > /pgpass
chmod 600 /pgpass
exec /entrypoint.sh "$@"
