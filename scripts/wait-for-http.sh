#!/usr/bin/env bash
# Wait until an HTTP endpoint returns curl success (-f).
# Usage: wait-for-http.sh <url> [max_attempts]
# Default max_attempts: 90 (~3 minutes at sleep 2s).
set -euo pipefail
url=${1:?url required}
max_attempts=${2:-90}
attempt=1
sleep_sec=2

while (( attempt <= max_attempts )); do
  if curl -sf --max-time 8 "${url}" >/dev/null 2>&1; then
    echo "healthy: ${url}"
    exit 0
  fi
  sleep "${sleep_sec}"
  attempt=$((attempt + 1))
done

echo "::error::timeout waiting for ${url}" >&2
exit 1
