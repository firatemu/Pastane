# Production checklist (Ubuntu 24.04 LTS)

Use this list before go-live and after major changes. Pair with [production-deployment-plan.md](production-deployment-plan.md).

## Documentation map

- [nginx-production-example.md](nginx-production-example.md) — reverse proxy, rate limits, staging hosts
- [backup-and-restore.md](backup-and-restore.md) — PostgreSQL and MinIO backup/restore
- [monitoring-and-observability.md](monitoring-and-observability.md) — health, logs, rotation
- [production-risk-review.md](production-risk-review.md) — risks and external dependencies
- [adr-polling-strategy.md](adr-polling-strategy.md) — polling vs WebSocket

## Server preparation

- [ ] **Ubuntu 24.04 LTS** (or equivalent LTS), security patches (`unattended-upgrades` or scheduled maintenance).
- [ ] Non-root deploy user with **Docker** group membership (or rootless Docker if policy requires).
- [ ] **Docker Engine** + **Compose V2** plugin installed and version-pinned in runbooks.
- [ ] **Time sync** (chrony/systemd-timesyncd) for logs, TLS, and token expiry.
- [ ] **Hostname** and `/etc/hosts` documented for staging simulations.

## VPS sizing

| Tier | vCPU | RAM | Root disk |
|------|------|-----|-----------|
| **MVP** | 4 | 8 GB | 120 GB NVMe (minimum guideline) |
| **Growth** | 8+ | 16+ GB | Proportionally larger; separate data volume if possible |

**MinIO:** object storage grows with **product images** and uploads. Plan a dedicated volume or bucket lifecycle; alert on **disk utilization** (e.g. 80% warning, 90% critical).

**PostgreSQL:** size for **data + indexes + WAL** + **bloat** headroom. Logical backups need **temporary disk** during `pg_dump`.

## Docker and Compose

- [ ] Production uses [docker/docker-compose.prod.yml](../docker/docker-compose.prod.yml) with **`.env.production`** (never committed): `chmod 600`.
- [ ] **Internal network:** database, Redis, MinIO, and app containers are **not** published on public ports except via **Nginx** (see deployment plan).
- [ ] **Image tags:** set **`IMAGE_TAG`** to a **semver** (e.g. `v1.0.0`); do not rely on **`latest`** for production rollouts.
- [ ] **Log rotation:** every long-running service uses `json-file` with `max-size` and `max-file` (see [monitoring-and-observability.md](monitoring-and-observability.md)).

## Firewall (UFW) and ports

- [ ] **Allow:** `22/tcp` from **trusted IPs only** (or VPN/bastion).
- [ ] **Allow:** `80/tcp`, `443/tcp` for Nginx.
- [ ] **Deny** from WAN: PostgreSQL **5432**, Redis **6379**, MinIO **9000/9001** (console).

Verify: `sudo ufw status verbose`, `ss -tlnp`.

## SSL / TLS

- [ ] **Production:** Let’s Encrypt (or corporate CA) with auto-renewal; Nginx `listen 443 ssl`.
- [ ] **Pre-domain / staging:** mkcert or self-signed; document trust steps for testers.
- [ ] Enable **HSTS** only when HTTPS is stable (see nginx doc).

`NODE_ENV=production` sets **Secure** cookies in Next.js BFF routes; **HTTPS must work** on the browser-facing host or sessions break.

## Secrets handling

- [ ] Generate strong **`JWT_SECRET`**, **`JWT_REFRESH_SECRET`**, **`POSTGRES_PASSWORD`**, **`REDIS_PASSWORD`**, **MinIO keys**; store only on server or secret manager.
- [ ] **Iyzico**, **FCM**, **SMS**, **SMTP**: placeholders in [.env.production.example](../.env.production.example); real values only on server.
- [ ] **Rotation procedure:** document who rotates what and how clients are forced to re-auth if needed.

## Swagger and API surface

- [ ] **`SWAGGER_ENABLED=false`** in production `.env.production`.
- [ ] If Swagger must exist temporarily, restrict by **IP** or **VPN** at Nginx, not public.

## Backups

- [ ] Automate [backup-db.sh](../backup-db.sh) (cron + retention).
- [ ] **Restore test** quarterly: [backup-and-restore.md](backup-and-restore.md).

## Monitoring and logging

- [ ] Health: `GET /health`.
- [ ] Disk alerts for root + Docker volumes.
- [ ] Optional: Sentry, Uptime Kuma (see monitoring doc).

## PostgreSQL (lightweight tuning notes)

**Goal:** operational guidance only—not a performance engagement.

- **Timezone:** align with business (**Europe/Istanbul**) via `timezone` in `postgresql.conf` or app session.
- **autovacuum:** keep **on**; watch churn tables (`orders`, `stock_*`).
- **max_connections:** size to NestJS + Prisma pools; avoid hundreds of idle connections.
- **shared_buffers:** rule of thumb ~25% RAM on a **dedicated** DB host; **lower** when PostgreSQL shares the host with apps and MinIO.
- **work_mem:** start conservative; raise only after observing sort/hash spill metrics.
- **Connection pooling:** consider **PgBouncer** (or similar) if connection count grows.
- **Backups:** logical dumps vs volume snapshots—know **crash consistency** during migrations (backup-and-restore doc).

## MinIO hardening

- [ ] **Console (9001)** not exposed publicly.
- [ ] **S3 API** exposed only where needed (often via **`storage.`** host behind Nginx).
- [ ] Review **bucket policy** and **public** vs private objects.
- [ ] Monitor **disk** growth.

## Redis / PostgreSQL exposure rules

- [ ] **Never** publish to `0.0.0.0` in production.
- [ ] Bind to **Docker bridge** or **127.0.0.1** on host if a host tool must connect.
- [ ] Strong passwords; Redis **`requirepass`**; TLS optional for internal links (advanced).

## Rate limiting

- [ ] Nginx **`limit_req`** on **`/api/v1/auth`** (and login-like paths).
- [ ] Verify limits under load; tune `burst`.
- [ ] Align with application-level rate limits if any.

## Docker log rotation

- [ ] Confirm every service in `docker-compose.prod.yml` has **`logging`** `json-file` **`max-size`** / **`max-file`**.
- Unbounded logs can **fill the disk** and **mask** incidents during outages.

## Optional security hardening (host-level; not automated in repo)

- **Fail2ban** (or cloud WAF) on repeated **401/403** and nginx **error** spikes.
- **SSH:** key-only auth, `PermitRootLogin no`, optional nonstandard port + allowlist.
- **Admin/courier** surfaces: restrict by VPN or IP allowlist if the business requires it.
- Do **not** treat this checklist as a complete penetration test; schedule **security review** separately.

## Pre-flight commands (reference)

```bash
pnpm run docker:prod:config
docker compose --env-file .env.production -f docker/docker-compose.prod.yml ps
curl -sfS https://api.azem.cloud/health
```

## Sign-off

| Role | Name | Date |
|------|------|------|
| Operator | | |
| Reviewer | | |
