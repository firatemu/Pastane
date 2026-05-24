#!/usr/bin/env bash
# Mirror local dev MinIO buckets to VPS production via SSH tunnel.
#
# Usage:
#   CONFIRM=YES bash scripts/sync-local-minio-to-vps.sh
#
# Requires: mc (MinIO client), ssh; scripts/deploy-vps.env.local with VPS_HOST
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if [[ "${CONFIRM:-}" != "YES" ]]; then
  echo "error: set CONFIRM=YES — this overwrites VPS MinIO bucket objects." >&2
  exit 1
fi

if ! command -v mc >/dev/null 2>&1; then
  echo "error: mc (MinIO client) not found. Install: https://min.io/docs/minio/linux/reference/minio-mc.html" >&2
  exit 1
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
TUNNEL_LOCAL_PORT="${MINIO_TUNNEL_PORT:-19000}"

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

echo "[1] Fetch VPS MinIO credentials..."
SSH=(ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -p "$VPS_PORT")
[[ -n "${VPS_SSH_IDENTITY:-}" ]] && SSH+=(-i "$VPS_SSH_IDENTITY")

VPS_ENV="$("${SSH[@]}" "${VPS_USER}@${VPS_HOST}" 'grep -E "^(MINIO_ACCESS_KEY|MINIO_SECRET_KEY|MINIO_BUCKET_PRODUCTS|MINIO_BUCKET_BANNERS|MINIO_BUCKET_PUBLIC)=" /var/www/pastane-app/app/.env.production 2>/dev/null | tail -4')"
eval "$(echo "$VPS_ENV" | sed 's/^/export /')"

VPS_ACCESS="${MINIO_ACCESS_KEY:?missing VPS MINIO_ACCESS_KEY}"
VPS_SECRET="${MINIO_SECRET_KEY:?missing VPS MINIO_SECRET_KEY}"

BUCKETS=(
  "${MINIO_BUCKET_PRODUCTS:-product-images}"
  "${MINIO_BUCKET_BANNERS:-banners}"
  "${MINIO_BUCKET_PUBLIC:-public}"
)

mc alias set pastane-local-sync "$LOCAL_ENDPOINT" "$LOCAL_ACCESS" "$LOCAL_SECRET" >/dev/null

echo "[2] SSH tunnel localhost:${TUNNEL_LOCAL_PORT} -> VPS 127.0.0.1:9000..."
TUNNEL_PID=""
cleanup() {
  if [[ -n "$TUNNEL_PID" ]] && kill -0 "$TUNNEL_PID" 2>/dev/null; then
    kill "$TUNNEL_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

SSH_TUNNEL=(ssh -N -o BatchMode=yes -o StrictHostKeyChecking=accept-new -p "$VPS_PORT" \
  -L "${TUNNEL_LOCAL_PORT}:127.0.0.1:9000")
[[ -n "${VPS_SSH_IDENTITY:-}" ]] && SSH_TUNNEL+=(-i "$VPS_SSH_IDENTITY")
"${SSH_TUNNEL[@]}" "${VPS_USER}@${VPS_HOST}" &
TUNNEL_PID=$!
sleep 2

mc alias set pastane-vps-sync "http://127.0.0.1:${TUNNEL_LOCAL_PORT}" "$VPS_ACCESS" "$VPS_SECRET" >/dev/null

echo "[3] Mirror buckets..."
for b in "${BUCKETS[@]}"; do
  echo "  pastane-local-sync/$b -> pastane-vps-sync/$b"
  mc mb --ignore-existing "pastane-local-sync/$b" 2>/dev/null || true
  mc mb --ignore-existing "pastane-vps-sync/$b" 2>/dev/null || true
  mc mirror --overwrite "pastane-local-sync/$b" "pastane-vps-sync/$b"
done

echo "MinIO sync complete."
