#!/usr/bin/env bash
# Push current branch to origin, run ./deploy.sh on VPS (remote), then rebuild local Docker prod
# (`docker-compose.prod.yml` + root `.env.production`) unless you opt out — same idea as VPS deploy.
#
# Defaults:
# - Branch must be `main`. Override with ALLOW_VPS_PUSH_NON_MAIN=1.
# - Runs `pnpm typecheck` before push unless `--skip-checks`.
# - After VPS `./deploy.sh` succeeds: `docker compose ... up -d --build` for local prod (--with-local-prod).
# - Opt out of local Docker prod: `--skip-local-prod` (VPS-only).
# - VPS_*: scripts/deploy-vps.env.local (see deploy-vps.env.example).
#
# Usage:
#   pnpm push:vps
#   pnpm push:vps:fast                              # skips typecheck
#   pnpm push:vps --skip-local-prod               # VPS only; no local prod rebuild
#   ALLOW_VPS_PUSH_NON_MAIN=1 pnpm push:vps       # push non-main branch, deploy still pulls per VPS
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SKIP_CHECKS=0
SKIP_LOCAL_PROD=0
ALLOW_DIRTY_FORWARD=()

for arg in "$@"; do
  case "$arg" in
    --skip-checks) SKIP_CHECKS=1 ;;
    --allow-dirty) ALLOW_DIRTY_FORWARD+=(--allow-dirty) ;;
    --skip-local-prod) SKIP_LOCAL_PROD=1 ;;
    -h|--help)
      sed -n '1,30p' "$0" >&2
      exit 0
      ;;
    *)
      echo "unknown option: $arg" >&2
      sed -n '1,20p' "$0" >&2
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

if [[ "$SKIP_CHECKS" -eq 0 ]] && command -v pnpm >/dev/null 2>&1; then
  echo 'pnpm typecheck …'
  pnpm typecheck
fi

echo "Git push origin ${BRANCH} …"
git push -u origin "$BRANCH"

DEPLOY_ARGS=(--remote-only)
[[ "$SKIP_CHECKS" -eq 1 ]] && DEPLOY_ARGS+=(--skip-checks)
DEPLOY_ARGS+=("${ALLOW_DIRTY_FORWARD[@]}")
[[ "$SKIP_LOCAL_PROD" -eq 0 ]] && DEPLOY_ARGS+=(--with-local-prod)

exec "$ROOT/scripts/deploy-vps.sh" "${DEPLOY_ARGS[@]}"
