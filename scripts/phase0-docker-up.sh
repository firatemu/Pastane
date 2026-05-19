#!/usr/bin/env bash
set -euo pipefail
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 22 >/dev/null
cd /home/azem/projects/Pastane
pnpm docker:dev:up