#!/usr/bin/env bash
# Fix root-owned `.next` trees (common after `docker compose` dev ran as root on bind mounts).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if ! command -v sudo >/dev/null 2>&1; then
  echo "sudo is required to chown root-owned files." >&2
  exit 1
fi
for app in admin web courier; do
  dir="$ROOT/apps/$app/.next"
  if [[ -d "$dir" ]]; then
    echo "chown $(id -u):$(id -g) $dir"
    sudo chown -R "$(id -u):$(id -g)" "$dir"
  fi
done
echo "Done. Or remove caches: rm -rf apps/*/.next"
