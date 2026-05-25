# Pastane documentation index

**Start here for AI agents and new contributors.** Only the documents below are maintained; older phase reports and migration runbooks were removed to avoid stale context.

## Onboarding

| Document                                                         | Purpose                                                           |
| ---------------------------------------------------------------- | ----------------------------------------------------------------- |
| [AI_HANDOFF_CONTEXT.md](./AI_HANDOFF_CONTEXT.md)                 | Primary agent onboarding: architecture, phases, conventions       |
| [ai-agent-rules.md](./ai-agent-rules.md)                         | Agent workflow expectations                                       |
| [development-phases.md](./development-phases.md)                 | High-level phase roadmap                                          |
| [PROJE-TEKNIK-DOKUMANTASYON.md](./PROJE-TEKNIK-DOKUMANTASYON.md) | **Ana teknik referans** — mimari, stack, API, DB, deploy (güncel) |

## Local development

| Document                                           | Purpose                                                |
| -------------------------------------------------- | ------------------------------------------------------ |
| [local-development.md](./local-development.md)     | Setup, Docker dev stack, Supabase CLI, troubleshooting |
| [git-workflow.md](./git-workflow.md)               | Branches and commits                                   |
| [DEPLOYMENT_WORKFLOW.md](./DEPLOYMENT_WORKFLOW.md) | `pnpm doctor`, `pnpm check`, deploy commands           |
| [mcp-tooling.md](./mcp-tooling.md)                 | Cursor MCP helpers                                     |

## Production (azem.cloud)

| Document                                                                 | Purpose                                                 |
| ------------------------------------------------------------------------ | ------------------------------------------------------- |
| [OPERATIONS.md](./OPERATIONS.md)                                         | Day-to-day ops: deploy, Supabase stack, health, backups |
| [github-actions-registry-deploy.md](./github-actions-registry-deploy.md) | GitHub Actions build/push + VPS pull-only deploy        |
| [azem-cloud-vps-deployment.md](./azem-cloud-vps-deployment.md)           | VPS runbook: nginx, DNS, deploy, Studio                 |
| [backup-and-restore.md](./backup-and-restore.md)                         | DB and MinIO backup/restore                             |
| [ROLLBACK_GUIDE.md](./ROLLBACK_GUIDE.md)                                 | App image rollback (`IMAGE_TAG`)                        |
| [nginx-production-example.md](./nginx-production-example.md)             | Host nginx patterns                                     |
| [monitoring-and-observability.md](./monitoring-and-observability.md)     | Health, logs, optional monitoring                       |
| [GITHUB_CI_SSH.md](./GITHUB_CI_SSH.md)                                   | GitHub Actions → VPS SSH                                |

## Domain-specific

| Document                                                                       | Purpose                                       |
| ------------------------------------------------------------------------------ | --------------------------------------------- |
| [iyzico_sandbox_entegrasyon_v3_web.md](./iyzico_sandbox_entegrasyon_v3_web.md) | Iyzico payment integration                    |
| [adr-polling-strategy.md](./adr-polling-strategy.md)                           | Polling vs WebSocket decision                 |
| [MOBILE-PHASED-PLAN.md](./MOBILE-PHASED-PLAN.md)                               | Mobile roadmap (not started unless requested) |
| [MOBILE_SYNC_WORKFLOW.md](./MOBILE_SYNC_WORKFLOW.md)                           | Mobile ↔ API sync workflow                    |
| [mobile-deploy-prep.md](./mobile-deploy-prep.md)                               | Mobile release prep                           |

## Key scripts (not docs)

| Script                                       | Purpose                                      |
| -------------------------------------------- | -------------------------------------------- |
| `deploy.sh`                                  | VPS production deploy (Supabase + app stack) |
| `scripts/push-vps.sh`                        | Local git push -> GitHub Actions deploy      |
| `scripts/sync-local-to-vps.sh`               | Local DB + MinIO → VPS sync                  |
| `scripts/backup-prod.sh` / `restore-prod.sh` | Production backup/restore                    |
| `scripts/generate-supabase-*.sh`             | Supabase env/secrets for new environments    |
