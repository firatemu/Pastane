#!/usr/bin/env bash
# Faz 7 — Production Supabase cutover (historical one-shot; completed 2026-05-24).
# Cutover overlay merged into docker-compose.prod.yml — do not re-run unless disaster recovery.
#
# Usage (VPS):
#   CONFIRM_CUTOVER=YES bash scripts/cutover-prod-supabase.sh
#
# Rollback: see docs/supabase-faz-6.9-final-build-validation.md
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_PROD="${COMPOSE_PROD:-docker/docker-compose.prod.yml}"
COMPOSE_SUPABASE="${COMPOSE_SUPABASE:-docker/docker-compose.supabase.prod.yml}"
PROJECT_PROD="${PROJECT_PROD:-pastane-prod}"
PROJECT_SUPABASE="${PROJECT_SUPABASE:-supabase-prod}"
IMAGE_TAG="${IMAGE_TAG:-v1.1.0-supabase-cutover}"
LOG_DIR="${LOG_DIR:-/var/www/pastane-app/backups/cutover}"

if [[ "${CONFIRM_CUTOVER:-}" != "YES" ]]; then
  echo "error: set CONFIRM_CUTOVER=YES to run production cutover." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: $ENV_FILE not found" >&2
  exit 1
fi

mkdir -p "$LOG_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
LOG="$LOG_DIR/cutover-${STAMP}.log"
exec > >(tee -a "$LOG") 2>&1

echo "=== Faz 7 Production Supabase Cutover ${STAMP} ==="

echo "[0] Pre-flight health"
curl -sf https://api.azem.cloud/health | head -c 200 || { echo "FAIL pre-cutover health"; exit 1; }
echo

echo "[1] Git sync"
git fetch origin main
git reset --hard origin/main
git log -1 --oneline

echo "[2] Backup .env.production"
cp "$ENV_FILE" "${ENV_FILE}.bak-${STAMP}"
chmod 600 "${ENV_FILE}.bak-${STAMP}"

echo "[3] Legacy postgres backup"
set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a
CUTOVER_BACKUP_DIR="${CUTOVER_BACKUP_DIR:-/var/www/pastane-app/backups}"
mkdir -p "$CUTOVER_BACKUP_DIR"
BACKUP_DIR="$CUTOVER_BACKUP_DIR" bash "$ROOT/scripts/backup-prod.sh"
OUT="$CUTOVER_BACKUP_DIR"
DUMP_FILE="$(ls -t "$OUT"/pastane-pg-*.dump | head -1)"
echo "Using dump: $DUMP_FILE"

echo "[4] Supabase prod DB up"
docker compose --project-name "$PROJECT_SUPABASE" --env-file "$ENV_FILE" -f "$COMPOSE_SUPABASE" up -d supabase-db
for _ in $(seq 1 30); do
  if docker compose --project-name "$PROJECT_SUPABASE" --env-file "$ENV_FILE" -f "$COMPOSE_SUPABASE" \
    exec -T supabase-db pg_isready -U "${POSTGRES_USER:-pastane_user}" -d "${POSTGRES_DB:-pastane_db}" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "[5] Stop API (writes paused)"
docker compose --project-name "$PROJECT_PROD" --env-file "$ENV_FILE" -f "$COMPOSE_PROD" stop api

echo "[6] Restore dump → supabase-db"
SKIP_API_START=1 DB_SERVICE=supabase-db DUMP_FILE="$DUMP_FILE" CONFIRM=YES bash "$ROOT/scripts/restore-prod.sh"

echo "[7] Update .env.production (DATABASE_URL → supabase-db, IMAGE_TAG)"
ENV_FILE="$ENV_FILE" IMAGE_TAG="$IMAGE_TAG" python3 <<'PY'
import os
import re
import urllib.parse
from pathlib import Path

env_path = Path(os.environ["ENV_FILE"])
lines = env_path.read_text(encoding="utf-8").splitlines()
data = {}
for line in lines:
    if not line or line.lstrip().startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    data[k.strip()] = v.strip()

user = data["POSTGRES_USER"]
password = urllib.parse.quote_plus(data["POSTGRES_PASSWORD"])
db = data["POSTGRES_DB"]
url = f"postgresql://{user}:{password}@supabase-db:5432/{db}"

replace = {
    "DATABASE_URL": url,
    "DIRECT_URL": url,
    "POSTGRES_HOST": "supabase-db",
    "POSTGRES_PORT": "5432",
    "IMAGE_TAG": os.environ.get("IMAGE_TAG", "v1.1.0-supabase-cutover"),
}
keys = set(replace)
out = []
seen = set()
for line in lines:
    if "=" in line and not line.lstrip().startswith("#"):
        key = line.split("=", 1)[0].strip()
        if key in keys:
            if key not in seen:
                out.append(f"{key}={replace[key]}")
                seen.add(key)
            continue
    out.append(line)
for key, val in replace.items():
    if key not in seen:
        out.append(f"{key}={val}")
env_path.write_text("\n".join(out) + "\n", encoding="utf-8")
print("Updated:", ", ".join(replace.keys()))
PY

echo "[8] Production compose up"
docker compose --project-name "$PROJECT_PROD" --env-file "$ENV_FILE" \
  -f "$COMPOSE_PROD" up -d

echo "[9] Wait for API healthy + prisma migrate deploy"
for _ in $(seq 1 60); do
  if curl -sf http://127.0.0.1:3003/health >/dev/null 2>&1; then break; fi
  sleep 3
done
docker compose --project-name "$PROJECT_PROD" --env-file "$ENV_FILE" \
  -f "$COMPOSE_PROD" exec -T api \
  sh -lc 'cd /app/packages/database && npx prisma migrate deploy --schema=schema.prisma'

echo "[10] Health checks"
sleep 3
curl -sf https://api.azem.cloud/health
echo
curl -sf http://127.0.0.1:3003/health | head -c 300
echo

echo "[11] Public endpoints spot-check"
curl -sf -o /dev/null -w "GET /products public=%{http_code}\n" https://api.azem.cloud/api/v1/products

echo "[12] Service status"
docker compose --project-name "$PROJECT_PROD" --env-file "$ENV_FILE" \
  -f "$COMPOSE_PROD" ps

echo "=== Cutover complete ==="
echo "Log: $LOG"
echo "Env backup: ${ENV_FILE}.bak-${STAMP}"
echo "Legacy postgres volume retained for rollback (profile legacy-db)."
