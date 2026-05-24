#!/usr/bin/env bash
# Snapshot RAM/disk/CPU for staging + prod containers (Faz 6.8 resource analysis).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/staging/_load-env.sh
source "$ROOT/scripts/staging/_load-env.sh"

REPORT="$STAGING_RESOURCE_REPORT"
mkdir -p "$(dirname "$REPORT")"

{
  echo "=== Resource snapshot $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
  echo
  echo "--- Host ---"
  free -m 2>/dev/null || true
  echo
  df -h / /var/lib/docker 2>/dev/null || df -h
  echo
  echo "--- Docker stats (staging + prod names) ---"
  docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}' 2>/dev/null | \
    grep -E 'staging|prod|NAME' || docker stats --no-stream 2>/dev/null | head -20
  echo
  echo "--- Volumes ---"
  docker volume ls | grep -E 'staging|pastane-prod|supabase_staging' || docker volume ls | head -20
} | tee "$REPORT"

echo "Resource report → $REPORT"
