#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=lib.sh
source "$(dirname "$0")/lib.sh"

load_dotenv
cd "${MCP_REPO_ROOT}"

if [[ -z "${STITCH_GOOG_API_KEY:-}" ]]; then
  echo "stitch MCP: STITCH_GOOG_API_KEY is not set in ${MCP_REPO_ROOT}/.env" >&2
  exit 1
fi

# stdio bridge so Cursor can load the API key from .env (remote url + ${env:} does not).
exec npx -y mcp-remote@latest \
  "https://stitch.googleapis.com/mcp" \
  --transport http-only \
  --header "X-Goog-Api-Key:${STITCH_GOOG_API_KEY}"
