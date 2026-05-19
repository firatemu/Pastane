#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=lib.sh
source "$(dirname "$0")/lib.sh"

cd "${MCP_REPO_ROOT}"
exec npx -y shadcn@latest mcp
