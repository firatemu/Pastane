# Backup and restore

Operational guide for PostgreSQL and MinIO. **Secrets** and **paths** live in `.env.production` on the server.

**Related:** [OPERATIONS.md](OPERATIONS.md), scripts [backup-prod.sh](../scripts/backup-prod.sh), [restore-prod.sh](../scripts/restore-prod.sh).

## Retention

Align with [`.env.production.example`](../.env.production.example) / `.env.production`:

- **`BACKUP_DIR`** — base directory for artifacts (VPS default: `/var/www/pastane-app/backups`)
- **`BACKUP_RETAIN_DAYS`** — delete older local copies **after** successful new backup (script may prune)

Tune for compliance (legal hold, longer retention off-server).

## PostgreSQL strategy (production — supabase-db)

Default backup target after Faz 7 cutover:

```bash
bash scripts/backup-prod.sh
```

This dumps **`supabase-db`** in the `supabase-prod` compose project.

### Logical dump (`pg_dump`)

- **Portable**, good for migrations between versions when formats match.
- Use **custom** format (`-Fc`) for parallel restore and compression.
- Run during **lower traffic**; dumps are consistent at start time for a single snapshot.

Manual example:

```bash
docker compose --project-name supabase-prod --env-file .env.production \
  -f docker/docker-compose.supabase.prod.yml exec -T supabase-db \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f "/tmp/pastane-$(date -u +%Y%m%dT%H%M%SZ).dump"
```

### Legacy postgres (rollback window only)

During the ~7-day post-cutover window:

```bash
DB_SERVICE=postgres bash scripts/backup-prod.sh
```

Uses compose profile **`legacy-db`** on `pastane-prod`.

### Before migrations

Take a backup **immediately before** `prisma migrate deploy` in production.

## MinIO strategy

### `mc mirror`

Use the MinIO client (`mc`) to replicate bucket content to a dated prefix or remote target. Good for **object-level** recovery.

### Volume backup

Stop MinIO or use **filesystem snapshots** of the MinIO data volume; verify **consistency** (object store can have large files).

## Restore procedure (high level)

1. **Stop** write traffic (maintenance page or scale API to zero if orchestrated).
2. **PostgreSQL:** restore dump to target service (`supabase-db` default, or `postgres` for legacy rollback):

```bash
CONFIRM=YES DUMP_FILE=/path/to/pastane-pg-....dump bash scripts/restore-prod.sh
```

3. **MinIO:** restore objects to buckets; verify **ACL/public** flags.
4. **Migrations:** ensure Prisma migration history matches the restored DB or run **`migrate deploy`** only if compatible.
5. **Smoke test** `/health`, `/api/v1/products`.

**Destructive:** [scripts/restore-prod.sh](../scripts/restore-prod.sh) requires `CONFIRM=YES`.

## Restore testing checklist

- [ ] Quarterly **dry run** on a non-production clone.
- [ ] Verify **row counts** / spot-check critical tables.
- [ ] Verify **random product images** load from MinIO.
- [ ] Document **RPO** (max acceptable data loss window) and **RTO** (time to restore).

## Disaster recovery notes

- Single-server deployment: DR is **backup + new server + restore**; no automatic multi-region failover.
- Store **encrypted** copies off-site (object storage, second region, or tape per policy).
- Document **runbook** owner and escalation.
