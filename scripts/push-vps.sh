#!/usr/bin/env bash
# Push current branch to origin, ardından GitHub Actions registry deploy akışını tetikler.
# Yerelde üretim Docker yığını çalıştırılmaz; VPS yalnızca hazır image'ları pull eder.
#
# Defaults:
# - Branch must be `main`. Override with ALLOW_VPS_PUSH_NON_MAIN=1.
# - Runs `pnpm typecheck` before push unless `--skip-checks`.
# - Git push sonrası deploy GitHub Actions tarafında devam eder; bu makinede ek Docker adımı yoktur.
# - VPS_*: scripts/deploy-vps.env.local (see deploy-vps.env.example).
#
# Usage:
#   pnpm push:vps                              # git push + GitHub Actions deploy (önerilen)
#   pnpm push:vps:fast                         # typecheck atlanır
#   ALLOW_VPS_PUSH_NON_MAIN=1 pnpm push:vps    # ...
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

if [[ -f "$ROOT/.env.production" ]]; then
  echo 'validate-env (.env.production) …'
  bash "$ROOT/scripts/validate-env.sh" "$ROOT/.env.production"
elif [[ "$SKIP_CHECKS" -eq 0 ]]; then
  echo "::notice push-vps: no .env.production at repo root — skipping validate-env (ok for VPS-only deploy)." >&2
fi

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

DEPLOY_ARGS=(--push-only)
[[ "$SKIP_CHECKS" -eq 1 ]] && DEPLOY_ARGS+=(--skip-checks)
DEPLOY_ARGS+=("${ALLOW_DIRTY_FORWARD[@]}")

exec "$ROOT/scripts/deploy-vps.sh" "${DEPLOY_ARGS[@]}"
