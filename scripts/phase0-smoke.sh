#!/usr/bin/env bash
set -euo pipefail
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 22 >/dev/null
cd /home/azem/projects/Pastane
pnpm --filter @pastane/api dev > /tmp/pastane-api.log 2>&1 &
api_pid=$!
pnpm --filter @pastane/web dev > /tmp/pastane-web.log 2>&1 &
web_pid=$!
pnpm --filter @pastane/admin dev > /tmp/pastane-admin.log 2>&1 &
admin_pid=$!
pnpm --filter @pastane/courier dev > /tmp/pastane-courier.log 2>&1 &
courier_pid=$!
cleanup() {
  kill "$api_pid" "$web_pid" "$admin_pid" "$courier_pid" 2>/dev/null || true
}
trap cleanup EXIT
for _ in $(seq 1 40); do
  if curl -fsS http://127.0.0.1:3003/api/v1/health >/tmp/health.json     && curl -fsS http://127.0.0.1:3000 >/tmp/web.html     && curl -fsS http://127.0.0.1:3001 >/tmp/admin.html     && curl -fsS http://127.0.0.1:3002 >/tmp/courier.html; then
    cat /tmp/health.json
    exit 0
  fi
  sleep 2
done
cat /tmp/pastane-api.log || true
cat /tmp/pastane-web.log || true
cat /tmp/pastane-admin.log || true
cat /tmp/pastane-courier.log || true
exit 1
