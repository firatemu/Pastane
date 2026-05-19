#!/usr/bin/env bash
set -euo pipefail
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 22 >/dev/null
cd /home/azem/projects/Pastane
node -v
pnpm -v
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
