# Supabase production — complete (Faz 7.2)

Production database runs as **self-hosted PostgreSQL** (`supabase-db`) in Docker project `supabase-prod`. This is **not** Supabase Cloud SaaS; there is no Auth/Realtime/Storage stack.

## Architecture

| Project | Compose file | Services |
|---------|--------------|----------|
| `supabase-prod` | [`docker/docker-compose.supabase.prod.yml`](../docker/docker-compose.supabase.prod.yml) | `supabase-db`, `supabase-studio` (pgAdmin) |
| `pastane-prod` | [`docker/docker-compose.prod.yml`](../docker/docker-compose.prod.yml) | api, web, admin, courier, redis, minio |

- **DB host (app):** `supabase-db:5432` via network `pastane_supabase`
- **Studio URL:** https://studio.azem.cloud → Host Nginx → `127.0.0.1:54323` (pgAdmin)
- **Legacy postgres:** stopped Faz 7.2 (`pastane_postgres_prod`); volume retained until Faz 7.3

## Routine operations

```bash
# Full deploy (includes supabase-db + studio when SUPABASE_STUDIO_ENABLED=1)
./deploy.sh

# DB backup (default target)
bash scripts/backup-prod.sh

# Studio one-time nginx + cert (VPS)
bash scripts/setup-studio-vps.sh
```

## Studio login

- URL: https://studio.azem.cloud
- Credentials: `SUPABASE_STUDIO_EMAIL` / `SUPABASE_STUDIO_PASSWORD` in `.env.production`
- Pre-registered server: **Pastane Production (supabase-db)** — password from `.pgpass` inside container

**Security:** Public studio access relies on pgAdmin login. Prefer IP whitelist later ([`deploy/nginx/pastane-studio.conf.example`](../deploy/nginx/pastane-studio.conf.example)).

## Legacy postgres (closed)

Final legacy dump taken via [`scripts/close-legacy-postgres.sh`](../scripts/close-legacy-postgres.sh). Rollback runbook archived: [`supabase-legacy-rollback-window.md`](supabase-legacy-rollback-window.md).

Volume removal (Faz 7.3): only after explicit approval and verified Supabase backups.

## Related docs

- [`OPERATIONS.md`](OPERATIONS.md)
- [`supabase-vps-cutover-plan-faz-6.5.md`](supabase-vps-cutover-plan-faz-6.5.md)
- [`azem-cloud-vps-deployment.md`](azem-cloud-vps-deployment.md)
