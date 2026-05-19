# Shared helpers for Cursor MCP launcher scripts (stdio servers).
set -euo pipefail

# Cursor may invoke MCP with a minimal PATH; prefer the user's Node/npx (nvm).
if [[ -d "${HOME}/.nvm/versions/node" ]]; then
  _mcp_node="$(ls -1d "${HOME}"/.nvm/versions/node/v* 2>/dev/null | sort -V | tail -1)"
  if [[ -n "${_mcp_node}" && -x "${_mcp_node}/bin/npx" ]]; then
    export PATH="${_mcp_node}/bin:${PATH}"
  fi
fi

MCP_REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

load_dotenv() {
  set -a
  if [[ -f "${MCP_REPO_ROOT}/.env" ]]; then
    # shellcheck source=/dev/null
    . "${MCP_REPO_ROOT}/.env"
  fi
  set +a
}

# Same host rewrite as packages/database/scripts/prisma-with-root-env.sh
host_database_url() {
  local url="${DATABASE_URL:-}"
  if [[ -z "${url}" ]]; then
    return 1
  fi
  if [[ ! -f /.dockerenv ]] && [[ "${DATABASE_URL_SEED:-}" != preserve ]]; then
    url="${url//@postgres:/@127.0.0.1:}"
  fi
  printf '%s' "${url}"
}
