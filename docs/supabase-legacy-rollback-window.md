# Legacy PostgreSQL rollback window (post Faz 7 Supabase cutover)

After production cutover to **supabase-db**, the old **`pastane_postgres_prod`** container and **`postgres_data`** volume are kept for a **7-day rollback window** only.

**Cutover reference date:** 2026-05-24  
**Legacy container stopped:** 2026-05-24 (Faz 7.2 — final backup taken)  
**Volume removal target:** Faz 7.3 (explicit approval)

## What is kept

| Artifact | Location |
|----------|----------|
| Pre-cutover dump | `/var/www/pastane-app/backups/pastane-pg-20260524T074507Z.dump` |
| Env backup | `/var/www/pastane-app/app/.env.production.bak-*` |
| Legacy container | `pastane_postgres_prod` (profile `legacy-db`) |
| Legacy volume | `pastane-prod_postgres_data` — **do not delete** during window |

## When to use DB rollback

Use only if **supabase-db** data is corrupted or cutover caused critical production issues **and** restoring the pre-cutover legacy snapshot is acceptable (RPO = data since cutover dump).

**Does not replace** normal app rollback (`IMAGE_TAG`) — see [`ROLLBACK_GUIDE.md`](ROLLBACK_GUIDE.md).

## DB rollback procedure (legacy postgres)

1. **Maintenance window** — announce downtime if needed.

2. **Restore env** from backup (example stamp):

```bash
cd /var/www/pastane-app/app
cp .env.production.bak-20260524T074507Z .env.production
# Verify DATABASE_URL/DIRECT_URL use @postgres:5432 and POSTGRES_HOST=postgres
```

3. **Skip validate-env** for this one-shot (normal deploy requires supabase-db). Or temporarily bypass deploy validation.

4. **Restore legacy database** from pre-cutover dump:

```bash
CONFIRM=YES \
  DUMP_FILE=/var/www/pastane-app/backups/pastane-pg-20260524T074507Z.dump \
  DB_SERVICE=postgres \
  bash scripts/restore-prod.sh
```

5. **Start legacy postgres** (if not running):

```bash
docker compose --project-name pastane-prod --env-file .env.production \
  --profile legacy-db -f docker/docker-compose.prod.yml up -d postgres
```

6. **Recreate app** with legacy env (pre-Faz-7.1 image may still expect postgres `depends_on` — use matching `IMAGE_TAG`):

```bash
IMAGE_TAG=<pre-cutover-tag> bash scripts/rollback-prod.sh
# Or manual compose up with legacy .env
```

7. **Verify:**

```bash
curl -fsS http://127.0.0.1:3003/health
curl -fsS https://api.azem.cloud/health
```

8. **Document** incident, data loss window, and whether to re-attempt Supabase cutover later.

## Forward path (return to supabase-db)

After fixing root cause:

1. Take fresh legacy dump if needed.
2. Restore `.env.production` with `@supabase-db` URLs.
3. Run [`scripts/cutover-prod-supabase.sh`](../scripts/cutover-prod-supabase.sh) or manual restore into supabase-db + `./deploy.sh`.

## End of rollback window (Faz 7.3)

After **2026-05-31** (or approved extension):

1. Final legacy backup: `DB_SERVICE=postgres bash scripts/backup-prod.sh`
2. Stop legacy container:

```bash
docker compose --project-name pastane-prod --env-file .env.production \
  --profile legacy-db -f docker/docker-compose.prod.yml stop postgres
```

3. After 7+ additional days and verified Supabase backups, optionally remove volume (irreversible):

```bash
# Only after explicit approval and verified backups
docker volume rm pastane-prod_postgres_data
```

4. Remove `legacy-db` profile from `docker-compose.prod.yml` in a follow-up PR.

## Related docs

- [`ROLLBACK_GUIDE.md`](ROLLBACK_GUIDE.md) — IMAGE_TAG rollback
- [`backup-and-restore.md`](backup-and-restore.md)
- [`supabase-vps-cutover-plan-faz-6.5.md`](supabase-vps-cutover-plan-faz-6.5.md)
