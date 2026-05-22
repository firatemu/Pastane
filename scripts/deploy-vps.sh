#!/usr/bin/env bash
# Deploy workflow from your machine: push to GitHub, then run ./deploy.sh on the VPS over SSH.
# Requires: VPS_* variables (via environment or scripts/deploy-vps.env.local — gitignored pattern).
#
# Usage:
#   chmod +x scripts/deploy-vps.sh
#   export VPS_HOST=... VPS_USER=deploy   # plus optional VPS_PORT, VPS_APP_DIR, VPS_SSH_IDENTITY
#   ./scripts/deploy-vps.sh
#
# Options:
#   --dry-run        Print steps only (no git push, no ssh).
#   --push-only      git push only (use when GitHub Actions runs deploy).
#   --remote-only    SSH ./deploy.sh only (code must already be on origin).
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
  sed -n '1,25p' "$0" >&2
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
BRANCH="${VPS_DEPLOY_BRANCH:-main}"

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

if [[ "$PUSH_ONLY" -eq 1 ]]; then
  echo "${DRY_RUN:+(dry-run) }Push step done; exiting (--push-only)."
  exit 0
fi

if [[ -z "$VPS_HOST" && "$DRY_RUN" -eq 0 ]]; then
  echo 'error: VPS_HOST is not set. Export it or create scripts/deploy-vps.env.local (see scripts/deploy-vps.env.example).' >&2
  exit 1
fi

SSH_BASE=(ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -p "$VPS_PORT")
if [[ -n "${VPS_SSH_IDENTITY:-}" ]]; then
  SSH_BASE+=(-i "$VPS_SSH_IDENTITY")
fi

REMOTE_CMD="$(printf 'cd %q && ./deploy.sh' "$VPS_APP_DIR")"
HOST_DISP="${VPS_HOST:-YOUR_VPS_HOST}"

if [[ "$DRY_RUN" -eq 1 ]]; then
  printf '[dry-run]'
  printf ' %q' "${SSH_BASE[@]}" "${VPS_USER}@${HOST_DISP}" "$REMOTE_CMD"
  printf '\n'
  exit 0
fi

"${SSH_BASE[@]}" "${VPS_USER}@${VPS_HOST}" "$REMOTE_CMD"

echo 'VPS deploy command finished.'
exit 0
