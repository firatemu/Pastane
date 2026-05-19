#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=lib.sh
source "$(dirname "$0")/lib.sh"

load_dotenv
cd "${MCP_REPO_ROOT}"

export GIT_BASE_DIR="${MCP_REPO_ROOT}"
export GIT_SIGN_COMMITS="${GIT_SIGN_COMMITS:-false}"
export MCP_LOG_LEVEL="${MCP_LOG_LEVEL:-warn}"
export MCP_TRANSPORT_TYPE=stdio

exec npx -y @cyanheads/git-mcp-server@latest
