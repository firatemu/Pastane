#!/usr/bin/env bash
# Fix root-owned build outputs (common after Docker / sudo runs). Run from repo root:
#   bash scripts/fix-build-permissions.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
U="$(id -un)"
G="$(id -gn)"

echo "Reowning build outputs under $ROOT to ${U}:${G} ..."

sudo chown -R "${U}:${G}" \
  "${ROOT}/apps/api/dist" \
  "${ROOT}/apps/web/.next" \
  "${ROOT}/apps/admin/.next" \
  "${ROOT}/apps/courier/.next" \
  2>/dev/null || true

# Optional: other emitted dirs
for d in "${ROOT}/packages/tr-api-errors/dist" "${ROOT}/packages/constants/dist" "${ROOT}/packages/database/dist" "${ROOT}/packages/types/dist" "${ROOT}/packages/ui/dist"; do
  if [[ -d "$d" ]]; then
    sudo chown -R "${U}:${G}" "$d" 2>/dev/null || true
  fi
done

echo "Done. Run: pnpm build"
