#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=lib.sh
source "$(dirname "$0")/lib.sh"

load_dotenv
cd "${MCP_REPO_ROOT}"

if ! url="$(host_database_url)"; then
  echo "postgres MCP: DATABASE_URL is not set in ${MCP_REPO_ROOT}/.env" >&2
  exit 1
fi

exec npx -y @modelcontextprotocol/server-postgres "${url}"
