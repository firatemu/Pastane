#!/usr/bin/env bash
# Push current branch to origin, then run ./deploy.sh on VPS (same as ./scripts/deploy-vps.sh --remote-only).
#
# Defaults:
# - Branch must be `main` (VPS pulls origin/main). Override with ALLOW_VPS_PUSH_NON_MAIN=1.
# - Runs `pnpm typecheck` before SSH unless you pass --skip-checks.
# - VPS_HOST etc.: scripts/deploy-vps.env.local (see deploy-vps.env.example).
#
# Usage (from repo root):
#   pnpm push:vps
#   pnpm push:vps:fast              # skips typecheck
#   ALLOW_VPS_PUSH_NON_MAIN=1 pnpm push:vps   # rare: deploy after pushing a feature branch
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SKIP_CHECKS=0
ALLOW_DIRTY_FORWARD=()

for arg in "$@"; do
  case "$arg" in
    --skip-checks) SKIP_CHECKS=1 ;;
    --allow-dirty) ALLOW_DIRTY_FORWARD+=(--allow-dirty) ;;
    -h|--help)
      sed -n '1,20p' "$0" >&2
      exit 0
      ;;
    *)
      echo "unknown option: $arg" >&2
      sed -n '1,14p' "$0" >&2
      exit 2
      ;;
  esac
done

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$BRANCH" != "main" && "${ALLOW_VPS_PUSH_NON_MAIN:-}" != "1" ]]; then
  echo "error: push-vps expects branch main (currently: ${BRANCH})." >&2
  echo "  Merge to main first, or set ALLOW_VPS_PUSH_NON_MAIN=1 if server should pull origin/main anyway." >&2
  exit 1
fi

echo "Git push origin ${BRANCH} …"
git push -u origin "$BRANCH"

DEPLOY_ARGS=(--remote-only)
[[ "$SKIP_CHECKS" -eq 1 ]] && DEPLOY_ARGS+=(--skip-checks)
DEPLOY_ARGS+=("${ALLOW_DIRTY_FORWARD[@]}")

exec "$ROOT/scripts/deploy-vps.sh" "${DEPLOY_ARGS[@]}"
