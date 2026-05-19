#!/usr/bin/env bash
set -euo pipefail
required=(
  .cursor/rules/project-overview.mdc
  .cursor/rules/ai-agent-workflow-rules.mdc
  package.json
  pnpm-workspace.yaml
  turbo.json
  tsconfig.base.json
  .env.example
  docs/development-workflow.md
  docs/development-phases.md
  apps/api/src/health/health.controller.ts
  apps/web/app/page.tsx
  apps/admin/app/page.tsx
  apps/courier/app/page.tsx
  apps/mobile/pubspec.yaml
  packages/database/package.json
)
for path in "${required[@]}"; do
  [[ -e "$path" ]] || { echo "Missing: $path"; exit 1; }
done
if find apps/api/src -mindepth 1 -maxdepth 1 -type d ! -name health | grep -q .; then
  echo "Unexpected Phase 1+ API modules detected."
  exit 1
fi
if find packages/database -type f -name 'schema.prisma' | grep -q .; then
  echo "Prisma schema detected before Phase 1."
  exit 1
fi
echo "Phase 0 structure verified."
