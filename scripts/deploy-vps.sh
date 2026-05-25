#!/usr/bin/env bash
# Production deploy helper from your machine.
# Default behaviour: push to GitHub and let GitHub Actions build/publish images and deploy them.
# Manual fallback: pass --remote-only to SSH into the VPS and run ./deploy.sh explicitly.
#
# Requires: VPS_* variables (via environment or scripts/deploy-vps.env.local — gitignored pattern)
# only for --remote-only mode.
#
# Usage:
#   chmod +x scripts/deploy-vps.sh
#   export VPS_HOST=... VPS_USER=deploy   # plus optional VPS_PORT, VPS_APP_DIR, VPS_SSH_IDENTITY
#   ./scripts/deploy-vps.sh
#
# Options:
#   --dry-run        Print steps only (no git push, no ssh).
#   --push-only      Push only (same as default GitHub Actions path).
#   --remote-only    SSH ./deploy.sh on the VPS (manual fallback / redeploy).
#   --skip-checks    Skip pnpm typecheck before push.
#   --allow-dirty    Allow deploying with uncommitted local changes (default: refuse).
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

DRY_RUN=0
PUSH_ONLY=0
REMOTE_ONLY=0
SKIP_CHECKS=0
ALLOW_DIRTY=0

LOCAL_ENV="$SCRIPT_DIR/deploy-vps.env.local"
if [[ -f "$LOCAL_ENV" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "$LOCAL_ENV"
  set +a
fi

usage() {
  sed -n '1,27p' "$0" >&2
  exit 2
}

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --push-only) PUSH_ONLY=1 ;;
    --remote-only) REMOTE_ONLY=1 ;;
    --skip-checks) SKIP_CHECKS=1 ;;
    --allow-dirty) ALLOW_DIRTY=1 ;;
    -h|--help) usage ;;
    *) echo "unknown option: $arg" >&2; usage ;;
  esac
done

if [[ "$PUSH_ONLY" -eq 1 && "$REMOTE_ONLY" -eq 1 ]]; then
  echo 'error: use only one of --push-only or --remote-only' >&2
  exit 1
fi

VPS_HOST="${VPS_HOST:-}"
VPS_USER="${VPS_USER:-deploy}"
VPS_PORT="${VPS_PORT:-22}"
VPS_APP_DIR="${VPS_APP_DIR:-/var/www/pastane-app/app}"
BRANCH="${VPS_DEPLOY_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"

_vh_norm="$(printf '%s' "$VPS_HOST" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')"

if [[ "$REMOTE_ONLY" -eq 1 && "$DRY_RUN" -eq 0 ]]; then
  if [[ -z "$_vh_norm" ]]; then
    echo 'error: VPS_HOST is not set — cannot run remote ./deploy.sh.' >&2
    if [[ ! -f "$LOCAL_ENV" ]]; then
      echo "  Create ${LOCAL_ENV} from scripts/deploy-vps.env.example and set VPS_HOST (and optional VPS_*)." >&2
    else
      echo "  ${LOCAL_ENV} exists but VPS_HOST is empty; set VPS_HOST to your server IP or hostname." >&2
    fi
    echo '  Or run: VPS_HOST=1.2.3.4 ./scripts/deploy-vps.sh --remote-only' >&2
    exit 1
  fi
  case "$_vh_norm" in
    your_vps_ip|your-vps-ip|changeme|placeholder|replace_me|todo|tbd)
      echo "error: VPS_HOST is still the example placeholder (${VPS_HOST})." >&2
      echo "  Edit ${LOCAL_ENV} (or export VPS_HOST) — use your server's public IP or DNS name, e.g. VPS_HOST=203.0.113.10" >&2
      exit 1
      ;;
  esac
fi

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run]'
    printf ' %q' "$@"
    printf '\n'
  else
    "$@"
  fi
}

dirty_lines="$(git status --porcelain 2>/dev/null | grep -v '^??' || true)"
if [[ -n "$dirty_lines" && "$ALLOW_DIRTY" -eq 0 ]]; then
  echo 'error: working tree has uncommitted changes. Commit/stash first or pass --allow-dirty' >&2
  echo "$dirty_lines" >&2
  exit 1
fi

if [[ "$SKIP_CHECKS" -eq 0 && "$REMOTE_ONLY" -eq 0 ]]; then
  if command -v pnpm >/dev/null 2>&1; then
    run pnpm typecheck
  else
    echo 'warning: pnpm not found; skipping typecheck' >&2
  fi
fi

if [[ "$REMOTE_ONLY" -eq 0 ]]; then
  run git push -u origin "$BRANCH"
fi

if [[ "$REMOTE_ONLY" -eq 0 ]]; then
  echo "${DRY_RUN:+(dry-run) }Push step done; GitHub Actions will build images and continue deployment."
  exit 0
fi

SSH_BASE=(ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -p "$VPS_PORT")
if [[ -n "${VPS_SSH_IDENTITY:-}" ]]; then
  SSH_BASE+=(-i "$VPS_SSH_IDENTITY")
fi

REMOTE_ENV_ASSIGNMENTS=()
for key in DEPLOY_GIT_REF IMAGE_TAG REGISTRY REGISTRY_SERVER SKIP_POST_DEPLOY_CHECKS; do
  value="${!key:-}"
  if [[ -n "${value// }" ]]; then
    printf -v assignment '%s=%q' "$key" "$value"
    REMOTE_ENV_ASSIGNMENTS+=("$assignment")
  fi
done

REMOTE_CMD="$(printf 'cd %q && ' "$VPS_APP_DIR")"
if [[ ${#REMOTE_ENV_ASSIGNMENTS[@]} -gt 0 ]]; then
  REMOTE_CMD+="${REMOTE_ENV_ASSIGNMENTS[*]} "
fi
REMOTE_CMD+="./deploy.sh"

HOST_DISP="${VPS_HOST:-YOUR_VPS_HOST}"

if [[ "$DRY_RUN" -eq 1 ]]; then
  ssh_id=""
  [[ -n "${VPS_SSH_IDENTITY:-}" ]] && ssh_id=" -i ${VPS_SSH_IDENTITY}"
  echo "[dry-run] ssh (-o BatchMode=yes -o StrictHostKeyChecking=accept-new) -p ${VPS_PORT}${ssh_id} ${VPS_USER}@${HOST_DISP}"
  echo "[dry-run]   remote: ${REMOTE_CMD}"
  exit 0
fi

"${SSH_BASE[@]}" "${VPS_USER}@${VPS_HOST}" "$REMOTE_CMD"

echo 'VPS deploy command finished.'

exit 0
