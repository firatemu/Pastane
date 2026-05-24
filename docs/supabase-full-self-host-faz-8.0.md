# Faz 8.0 — Tam Supabase self-host (production)

Production runs the **official Supabase Docker stack** (PostgreSQL 17, Studio, Kong, Auth, REST, Realtime, Storage, Meta, Analytics). Pastane **only uses PostgreSQL** via `DATABASE_URL`; NestJS JWT, MinIO, and BullMQ are unchanged.

## URLs

| URL | Service |
|-----|---------|
| https://studio.azem.cloud | Supabase Studio (Dashboard) |
| https://api.azem.cloud | Pastane NestJS API (unchanged) |

Studio login: `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD` in `.env.production`.

## Architecture

- Docker project: `supabase-prod`
- Compose layers: [`docker/supabase/docker-compose.yml`](../docker/supabase/docker-compose.yml) + [`docker-compose.pg17.yml`](../docker/supabase/docker-compose.pg17.yml) + [`docker-compose.pastane.prod.yml`](../docker/supabase/docker-compose.pastane.prod.yml)
- Network: `pastane_supabase` — API reaches DB via alias **`supabase-db`**
- Studio: `127.0.0.1:54323` → host nginx → https://studio.azem.cloud
- Kong / Supavisor: **not** exposed on host ports

## Env variables (Pastane `.env.production`)

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | Pastane API only — do not reuse for Supabase |
| `SUPABASE_JWT_SECRET` | Supabase stack internal JWT |
| `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase API keys (HS256) |
| `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD` | Studio login |
| `SUPABASE_PUBLIC_URL` | `https://studio.azem.cloud` |
| `POSTGRES_*` / `DATABASE_URL` | Prisma → `pastane_db` @ `supabase-db` |

Generate new secrets:

```bash
bash scripts/generate-supabase-secrets.sh
```

Migrate from Faz 7.2 pgAdmin env (VPS):

```bash
bash scripts/migrate-env-supabase-faz8.sh .env.production
```

Runtime compose env (auto-generated, gitignored):

```bash
bash scripts/generate-supabase-compose-env.sh .env.production
```

## Routine deploy

[`deploy.sh`](../deploy.sh) ensures the full `supabase-prod` stack, then `pastane-prod` app stack.

```bash
./deploy.sh
```

## Production cutover (one-time, Faz 8.0)

Prerequisites: backup, migrated `.env.production`, maintenance window.

```bash
bash scripts/migrate-env-supabase-faz8.sh .env.production
bash scripts/validate-env.sh .env.production
CONFIRM=YES bash scripts/cutover-full-supabase-prod.sh
```

Cutover: stops legacy pgAdmin + plain Postgres, snapshots volume `supabase_prod_db_data_legacy_faz8`, fresh Supabase init, `pg_restore` into `pastane_db`.

## Rollback (7-day window)

1. Stop API and supabase-prod stack.
2. Remove new `supabase_prod_db_data` volume.
3. Restore legacy volume: recreate `supabase_prod_db_data` from `supabase_prod_db_data_legacy_faz8` (see [`supabase-legacy-rollback-window.md`](supabase-legacy-rollback-window.md) pattern).
4. Checkout pre-Faz-8.0 git tag and `./deploy.sh` with legacy compose **or** restore from `pastane-pg-*.dump` into legacy `postgres:16-alpine` compose (documented in git history).

Fast rollback if dump exists:

```bash
# Restore pre-cutover git + legacy compose, then:
DUMP_FILE=/var/www/pastane-app/backups/pastane-pg-....dump CONFIRM=YES bash scripts/restore-prod.sh
```

## Upgrade upstream Supabase

1. Re-vendor `docker/supabase/` from a **tagged** release.
2. Staging test with [`docker-compose.supabase.staging.yml`](../docker/docker-compose.supabase.staging.yml).
3. Backup → `docker compose pull` → `up -d` → smoke.

Pin recorded in [`docker/supabase/README.pastane.md`](../docker/supabase/README.pastane.md).

## Verification checklist

- [ ] https://studio.azem.cloud shows Supabase Studio (not pgAdmin)
- [ ] Table Editor lists Prisma `public` tables
- [ ] https://api.azem.cloud/health OK
- [ ] `prisma migrate deploy` OK
- [ ] Kong port 8000 not reachable from internet

## Related

- [`supabase-production-complete.md`](supabase-production-complete.md)
- [`OPERATIONS.md`](OPERATIONS.md)
