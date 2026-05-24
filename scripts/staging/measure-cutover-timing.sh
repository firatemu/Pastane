#!/usr/bin/env bash
# Measure staging cutover timings → JSON report (Faz 6.8).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/staging/_load-env.sh
source "$ROOT/scripts/staging/_load-env.sh"

COMPOSE_APP="${COMPOSE_APP:-docker/docker-compose.staging.yml}"
COMPOSE_SUPABASE="${COMPOSE_SUPABASE:-docker/docker-compose.supabase.staging.yml}"
PROJECT_APP="${PROJECT_APP:-pastane-staging}"
PROJECT_SUPABASE="${PROJECT_SUPABASE:-supabase-staging}"
REPORT="$STAGING_TIMING_REPORT"
DB_USER="${STAGING_POSTGRES_USER:-${POSTGRES_USER:-pastane_staging_user}}"
DB_NAME="${STAGING_POSTGRES_DB:-${POSTGRES_DB:-pastane_db_staging}}"

mkdir -p "$(dirname "$REPORT")"
START_TOTAL=$(date +%s)

log_step() { echo "[timing] $1"; }

log_step "1/4 supabase-db startup"
T0=$(date +%s)
docker compose --project-name "$PROJECT_SUPABASE" --env-file "$ENV_FILE" -f "$COMPOSE_SUPABASE" up -d supabase-db
for _ in $(seq 1 60); do
  if docker compose --project-name "$PROJECT_SUPABASE" --env-file "$ENV_FILE" -f "$COMPOSE_SUPABASE" \
    exec -T supabase-db pg_isready -U "${DB_USER}" -d "${DB_NAME}" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
DB_START_SEC=$(($(date +%s) - T0))

log_step "2/4 pg_restore (if DUMP_FILE or latest pointer set)"
RESTORE_SEC=0
if [[ -f "${BACKUP_DIR}/.latest-prod-source-dump" ]]; then
  T1=$(date +%s)
  bash "$ROOT/scripts/staging/restore-to-staging.sh" || true
  RESTORE_SEC=$(($(date +%s) - T1))
fi

log_step "3/4 prisma migrate deploy (staging api container or one-off)"
T2=$(date +%s)
docker compose --project-name "$PROJECT_APP" --env-file "$ENV_FILE" -f "$COMPOSE_APP" up -d api 2>/dev/null || true
sleep 5
docker compose --project-name "$PROJECT_APP" --env-file "$ENV_FILE" -f "$COMPOSE_APP" \
  exec -T api sh -lc 'cd /app/packages/database && npx prisma migrate deploy --schema=schema.prisma' 2>/dev/null || MIGRATE_SEC=0
MIGRATE_SEC=$(($(date +%s) - T2))

log_step "4/4 full staging stack health"
T3=$(date +%s)
docker compose --project-name "$PROJECT_APP" --env-file "$ENV_FILE" -f "$COMPOSE_APP" up -d
for _ in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:3103/health" >/dev/null 2>&1; then break; fi
  sleep 3
done
APP_START_SEC=$(($(date +%s) - T3))
TOTAL_SEC=$(($(date +%s) - START_TOTAL))

node -e "
const r = {
  measuredAt: new Date().toISOString(),
  seconds: {
    supabaseDbStartup: ${DB_START_SEC},
    pgRestoreAndSanitize: ${RESTORE_SEC},
    prismaMigrateDeploy: ${MIGRATE_SEC},
    stagingAppStartup: ${APP_START_SEC},
    totalEstimate: ${TOTAL_SEC},
  },
  notes: 'Run on VPS after restore-to-staging. pg_restore=0 if no dump pointer.',
};
require('fs').writeFileSync(process.argv[1], JSON.stringify(r, null, 2));
" "$REPORT"

echo "Timing report → $REPORT"
cat "$REPORT"
