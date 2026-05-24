# Runtime recovery tests (local Docker prod stack)

Use this checklist when validating **resilience** on a developer machine running [`docker/docker-compose.prod.yml`](../docker/docker-compose.prod.yml) with `.env.prod`. Record outcomes in the [local QA acceptance report](local-qa-acceptance-report.md) or the execution log at the bottom.

## Preconditions

- Stack is up and healthy (`/api/v1/health` via Nginx with `Host: api.staging.local`).
- You accept **brief** HTTP failures during restarts.

## Container restart matrix

| # | Command | Expected behavior |
|---|---------|---------------------|
| 1 | `docker compose --env-file .env.prod -f docker/docker-compose.prod.yml restart api` | Health returns **200** after API is ready; BullMQ workers reconnect to Redis; in-flight requests may fail during the window. |
| 2 | `docker compose ... restart redis` | API may error until Redis is up; then health OK and **queue processing resumes** (retry delayed jobs as designed). |
| 3 | `docker compose ... restart postgres` | API returns errors until Postgres accepts connections; data persisted on volume; migrations already applied—no auto re-seed. |
| 4 | `docker compose ... restart minio` | Media health/recovery; objects on volume persist. |
| 5 | After code change | `docker compose ... up -d --build` (or `docker compose --env-file .env.production -f docker/docker-compose.prod.yml build` then up) reproduces deploy rehearsal; smoke tests pass. |

**Nginx** (`edge` service, if named in compose): restarting only Nginx should restore static routing quickly; use the same curl smoke tests.

## Queue recovery expectations

- Redis restart: delayed and waiting jobs should **not** be silently dropped by Redis persistence settings—note your `redis.conf` / image defaults in the acceptance report if jobs disappear.
- API restart: in-process workers stop with the process; after restart, **new** worker instances consume queues; verify one payment-timeout or reservation path if possible.

## Host port isolation (optional)

With correct prod compose, **PostgreSQL 5432** should not listen on the host. Quick check:

```bash
# Should fail or refuse when compose does not publish 5432:
nc -zv 127.0.0.1 5432 2>&1 || true
```

## Backup / restore drill

- **Backup:** `BACKUP_DIR=/tmp/pastane-pg-backups bash scripts/backup-prod.sh` (or another writable dir). Produces `pastane-pg-*.dump`.
- **Restore (destructive):** Only on disposable data. Example:

  ```bash
  DUMP_FILE=/tmp/pastane-pg-backups/pastane-pg-YYYYMMDDTHHMMSSZ.dump \
    CONFIRM=YES bash scripts/restore-prod.sh
  ```

  Then verify API health and login. See [backup-and-restore.md](backup-and-restore.md) for MinIO (`mc mirror` / volume copy).

## Execution log (agent / operator)

| Date | Tester | Scenario | Result | Duration notes |
|------|--------|----------|--------|----------------|
|      |        |          |        |                |

### Automated run snapshot (2026-05-18 / agent)

Run on WSL2 against `docker/docker-compose.prod.yml` with `.env.prod`. Nginx smoke: `GET /api/v1/health` with `Host: api.staging.local` returned **200** after each restart.

- **api restart:** **pass** — health 200 ~8–10s after `docker restart pastane_api_prod`.  
- **redis restart:** **pass** — health 200 ~6s after `docker restart pastane_redis_prod`.  
- **postgres restart:** **pass** — health 200 ~15s after `docker restart pastane_postgres_prod`.  
- **minio restart:** **pass** — health JSON reported `minio: true` after `docker restart pastane_minio_prod`.  
- **backup (pg_dump):** **pass** — `BACKUP_DIR=/tmp/pastane-pg-backups bash scripts/backup-prod.sh` (requires [caller `BACKUP_DIR` preserved](../scripts/backup-prod.sh) so it is not replaced by `.env.prod`).  
- **restore:** **pass** — `DUMP_FILE=... CONFIRM=YES bash scripts/restore-prod.sh`; API restarted; login + health OK afterward.  
- **host port 5432 / 6379:** On this machine **`nc -zv 127.0.0.1 5432` succeeded** because a **separate dev stack** (`pastane_postgres_dev` / `pastane_redis_dev`) still publishes those ports. **Prod** containers only show `5432/tcp` without `0.0.0.0:` binding — isolate dev stacks or stop them when validating prod isolation.  

---

Related: [qa-test-scenarios.md](qa-test-scenarios.md), [regression-checklist.md](regression-checklist.md).
