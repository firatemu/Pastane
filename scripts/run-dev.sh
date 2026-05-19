#!/usr/bin/env bash
set -euo pipefail
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 22 >/dev/null
cd /home/azem/projects/Pastane
pnpm --filter @pastane/api dev > /tmp/pastane-api.log 2>&1 &
pnpm --filter @pastane/web dev > /tmp/pastane-web.log 2>&1 &
pnpm --filter @pastane/admin dev > /tmp/pastane-admin.log 2>&1 &
pnpm --filter @pastane/courier dev > /tmp/pastane-courier.log 2>&1 &
wait
