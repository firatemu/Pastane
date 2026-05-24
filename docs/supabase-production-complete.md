# Supabase production — complete (Faz 8.0)

Production database runs as **official self-hosted Supabase** (`supabase-prod` Docker project): PostgreSQL 17 + full stack. Pastane API uses **only** `pastane_db` via network alias `supabase-db`.

## Architecture

| Project | Compose | Services |
|---------|---------|----------|
| `supabase-prod` | [`docker/supabase/`](../docker/supabase/) + Pastane overrides | db, studio, kong, auth, rest, realtime, storage, meta, analytics, … |
| `pastane-prod` | [`docker/docker-compose.prod.yml`](../docker/docker-compose.prod.yml) | api, web, admin, courier, redis, minio |

- **DB host (app):** `supabase-db:5432` → Supabase `db` service alias
- **Studio URL:** https://studio.azem.cloud → `127.0.0.1:54323` (Supabase Studio :3000)
- **Legacy pgAdmin / postgres:16-alpine:** removed Faz 8.0

## Routine operations

```bash
./deploy.sh
bash scripts/backup-prod.sh
```

## Studio login

- URL: https://studio.azem.cloud
- **Dashboard:** `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD`
- **Database password** (manual psql only): `POSTGRES_PASSWORD` — not the dashboard password

See [`supabase-full-self-host-faz-8.0.md`](supabase-full-self-host-faz-8.0.md) for secrets, cutover, and rollback.

## Related docs

- [`OPERATIONS.md`](OPERATIONS.md)
- [`supabase-vps-cutover-plan-faz-6.5.md`](supabase-vps-cutover-plan-faz-6.5.md)
