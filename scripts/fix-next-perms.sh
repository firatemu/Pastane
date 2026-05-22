#!/usr/bin/env bash
# Fix root-owned `.next` trees (common after `docker compose` dev ran as root on bind mounts).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if ! command -v sudo >/dev/null 2>&1; then
  echo "sudo is required to chown root-owned files." >&2
  exit 1
fi
for app in admin web courier; do
  for dir in .next .next-docker .next-host .next-ci; do
    path="$ROOT/apps/$app/$dir"
    if [[ -d "$path" ]]; then
      echo "chown $(id -u):$(id -g) $path"
      sudo chown -R "$(id -u):$(id -g)" "$path"
    fi
  done
done
echo "Done. To fully reset dev CSS/chunks: pnpm fix:frontend-cache"
