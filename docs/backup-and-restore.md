# Backup and restore

Operational guide for PostgreSQL and MinIO. **Secrets** and **paths** live in `.env.prod` on the server.

**Related:** [production-checklist.md](production-checklist.md), [production-deployment-plan.md](production-deployment-plan.md), scripts [backup-prod.sh](../scripts/backup-prod.sh), [restore-prod.sh](../scripts/restore-prod.sh).

## Retention

Align with [`.env.example`](../.env.example) / `.env.prod`:

- **`BACKUP_DIR`** — base directory for artifacts  
- **`BACKUP_RETAIN_DAYS`** — delete older local copies **after** successful new backup (script may prune)

Tune for compliance (legal hold, longer retention off-server).

## PostgreSQL strategy

### Logical dump (`pg_dump`)

- **Portable**, good for migrations between versions when formats match.  
- Use **custom** format (`-Fc`) for parallel restore and compression.  
- Run during **lower traffic**; dumps are consistent at start time for a single snapshot (use `pg_dump` from a replica if you add one later).

Example pattern (executed from host or `postgres` container with right credentials):

```bash
docker compose -f docker/docker-compose.prod.yml --env-file .env.prod exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f "/tmp/pastane-$(date -u +%Y%m%dT%H%M%SZ).dump"
```

Copy the file from the container to **`BACKUP_DIR`** on the host.

### Volume / filesystem snapshot

- **Fast** for large databases.  
- **Crash-consistent** if PostgreSQL is running—prefer **quiet** IO or use **pg_start_backup** / managed cloud snapshots per provider docs.  
- Combine with **WAL archiving** (PITR) only if you adopt that architecture.

### Before migrations

Take a backup **immediately before** `prisma migrate deploy` in production.

## MinIO strategy

### `mc mirror`

Use the MinIO client (`mc`) to replicate bucket content to a dated prefix or remote target. Good for **object-level** recovery.

### Volume backup

Stop MinIO or use **filesystem snapshots** of the MinIO data volume; verify **consistency** (object store can have large files).

### Growth

MinIO usage correlates with **catalog images** and **user uploads**. Monitor volume size; see [production-checklist.md](production-checklist.md) VPS section.

## Restore procedure (high level)

1. **Stop** write traffic (maintenance page or scale API to zero if orchestrated).  
2. **PostgreSQL:** restore dump to a **fresh** database or drop/recreate only with explicit approval.  
3. **MinIO:** restore objects to buckets; verify **ACL/public** flags.  
4. **Migrations:** ensure Prisma migration history matches the restored DB or run **`migrate deploy`** only if compatible.  
5. **Smoke test** `/api/v1/health`, login, catalog.

**Destructive:** [scripts/restore-prod.sh](../scripts/restore-prod.sh) requires explicit confirmation.

## Restore testing checklist

- [ ] Quarterly **dry run** on a non-production clone.  
- [ ] Verify **row counts** / spot-check critical tables.  
- [ ] Verify **random product images** load from MinIO.  
- [ ] Document **RPO** (max acceptable data loss window) and **RTO** (time to restore).

## Disaster recovery notes

- Single-server deployment: DR is **backup + new server + restore**; no automatic multi-region failover.  
- Store **encrypted** copies off-site (object storage, second region, or tape per policy).  
- Document **runbook** owner and escalation.
