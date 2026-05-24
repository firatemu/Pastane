#!/usr/bin/env bash
# Mirror local dev MinIO buckets to VPS production.
#
# Usage:
#   CONFIRM=YES bash scripts/sync-local-minio-to-vps.sh
#
# Strategy: export local buckets to /tmp, rsync to VPS, import via minio/mc on Docker network.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if [[ "${CONFIRM:-}" != "YES" ]]; then
  echo "error: set CONFIRM=YES — this overwrites VPS MinIO bucket objects." >&2
  exit 1
fi

MC="${MC:-mc}"
if ! command -v "$MC" >/dev/null 2>&1; then
  if [[ -x /tmp/mc ]]; then
    MC=/tmp/mc
  else
    echo "error: mc not found. Install MinIO client or set MC=/path/to/mc" >&2
    exit 1
  fi
fi

LOCAL_ENV="$SCRIPT_DIR/deploy-vps.env.local"
if [[ -f "$LOCAL_ENV" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "$LOCAL_ENV"
  set +a
fi

VPS_HOST="${VPS_HOST:-}"
VPS_USER="${VPS_USER:-deploy}"
VPS_PORT="${VPS_PORT:-22}"
VPS_APP_DIR="${VPS_APP_DIR:-/var/www/pastane-app/app}"

if [[ -z "$VPS_HOST" || "$VPS_HOST" == "YOUR_VPS_IP" ]]; then
  echo "error: set VPS_HOST in scripts/deploy-vps.env.local" >&2
  exit 1
fi

if [[ -f "$ROOT/.env" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "$ROOT/.env"
  set +a
fi

LOCAL_ACCESS="${MINIO_ACCESS_KEY:-minioadmin}"
LOCAL_SECRET="${MINIO_SECRET_KEY:-change_me}"
LOCAL_ENDPOINT="http://127.0.0.1:${MINIO_PORT:-9000}"
EXPORT_DIR="${MINIO_EXPORT_DIR:-/tmp/pastane-minio-export-$$}"
REMOTE_EXPORT="/tmp/pastane-minio-export"

SSH=(ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -p "$VPS_PORT")
RSYNC=(rsync -az --delete)
[[ -n "${VPS_SSH_IDENTITY:-}" ]] && SSH+=(-i "$VPS_SSH_IDENTITY") && RSYNC+=(-e "ssh -o BatchMode=yes -p ${VPS_PORT} -i ${VPS_SSH_IDENTITY}")

BUCKETS=(
  "${MINIO_BUCKET_PRODUCTS:-product-images}"
  "${MINIO_BUCKET_BANNERS:-banners}"
  "${MINIO_BUCKET_PUBLIC:-public}"
)

echo "[1] Export local MinIO buckets to ${EXPORT_DIR}..."
"$MC" alias set pastane-local-sync "$LOCAL_ENDPOINT" "$LOCAL_ACCESS" "$LOCAL_SECRET" >/dev/null
mkdir -p "$EXPORT_DIR"
for b in "${BUCKETS[@]}"; do
  echo "  export $b"
  if "$MC" ls "pastane-local-sync/$b" >/dev/null 2>&1; then
    "$MC" mirror --overwrite "pastane-local-sync/$b" "${EXPORT_DIR}/${b}"
  else
    echo "    skip (bucket missing locally)"
  fi
done

echo "[2] Rsync export to VPS ${REMOTE_EXPORT}..."
"${RSYNC[@]}" "${EXPORT_DIR}/" "${VPS_USER}@${VPS_HOST}:${REMOTE_EXPORT}/"

echo "[3] Import into VPS MinIO (docker network)..."
VPS_ENV="$("${SSH[@]}" "${VPS_USER}@${VPS_HOST}" \
  'grep -E "^(MINIO_ACCESS_KEY|MINIO_SECRET_KEY|MINIO_BUCKET_PRODUCTS|MINIO_BUCKET_BANNERS|MINIO_BUCKET_PUBLIC)=" '"$(printf '%q' "$VPS_APP_DIR")"'/.env.production | tail -5')"
eval "$(echo "$VPS_ENV" | sed 's/^/export /')"

VPS_ACCESS="${MINIO_ACCESS_KEY:?missing VPS MINIO_ACCESS_KEY}"
VPS_SECRET="${MINIO_SECRET_KEY:?missing VPS MINIO_SECRET_KEY}"
DOCKER_NET="${MINIO_DOCKER_NETWORK:-pastane-prod_pastane_internal}"
MINIO_URL="${MINIO_INTERNAL_URL:-http://minio:9000}"

IMPORT_BUCKETS=(
  "${MINIO_BUCKET_PRODUCTS:-product-images}"
  "${MINIO_BUCKET_BANNERS:-banners}"
  "${MINIO_BUCKET_PUBLIC:-public}"
)

for b in "${IMPORT_BUCKETS[@]}"; do
  if ! "${SSH[@]}" "${VPS_USER}@${VPS_HOST}" "test -d ${REMOTE_EXPORT}/${b}"; then
    echo "  skip import $b (no export dir)"
    continue
  fi
  echo "  import $b"
  "${SSH[@]}" "${VPS_USER}@${VPS_HOST}" \
    "docker run --rm --network ${DOCKER_NET} \
      -v ${REMOTE_EXPORT}/${b}:/import:ro \
      --entrypoint /bin/sh minio/mc -c \
      'mc alias set prod ${MINIO_URL} ${VPS_ACCESS} ${VPS_SECRET} && mc mb --ignore-existing prod/${b} && mc mirror --overwrite /import prod/${b}'"
done

rm -rf "$EXPORT_DIR"
echo "MinIO sync complete."
