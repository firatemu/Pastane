# Production deployment plan

This document describes how to move from **local development** to **production cutover** for the Pastane Platform. It is **documentation only**; operators adapt commands to their hosts and secrets.

**Related documents**

- [production-checklist.md](production-checklist.md) — server prep, sizing, security hardening notes  
- [nginx-production-example.md](nginx-production-example.md) — reverse proxy, staging hosts, TLS  
- [backup-and-restore.md](backup-and-restore.md) — backups, restores, retention  
- [monitoring-and-observability.md](monitoring-and-observability.md) — health, logs, alerts  
- [production-risk-review.md](production-risk-review.md) — risks and blockers  
- [adr-polling-strategy.md](adr-polling-strategy.md) — polling vs WebSocket (operational context)

## Staging strategy and pipeline

Ordered progression:

1. **Localhost (dev)** — [docker-compose.dev.yml](../docker/docker-compose.dev.yml), `.env`. Fast iteration, hot reload.  
2. **Local production simulation** — Same repo, [docker-compose.prod.yml](../docker/docker-compose.prod.yml) on a workstation with `.env.prod` built from [.env.prod.example](../.env.prod.example). Validates multi-container layout, migrations, Nginx routing, and **pinned image tags** without a public VPS.  
3. **Staging** — Non-production VPS or shared environment: real Linux + Docker, optional **hosts-based** or DNS names such as `staging.local` / `api.staging.local` (see below). Mirrors TLS, cookies, and CORS more accurately than plain `localhost`.  
4. **Production** — Ubuntu 24.04 LTS, locked-down network, real domains, production secrets, backups and monitoring.

**Why staging parity matters**

Without it, common failures appear only in production:

- **Secure cookies** (`Secure`, `SameSite`) behaving differently without HTTPS  
- Wrong **public URLs** in emails, redirects, or payment callbacks  
- **CORS** misconfiguration when the browser origin differs from assumptions  
- **Reverse proxy** errors (`X-Forwarded-Proto`, `Host`) breaking auth or absolute links  
- **Upload** failures when Nginx `client_max_body_size` is smaller than the API

**Hosts-file local staging examples**

| Host                 | Role          |
|----------------------|---------------|
| `staging.local`      | Customer web  |
| `api.staging.local`  | API           |
| `admin.staging.local`| Admin         |
| `courier.staging.local` | Courier   |

Map these to `127.0.0.1` (or the staging server IP). Use **mkcert** or short-lived **self-signed** certificates so `NODE_ENV=production` cookie behavior matches production.

**Validation goals**

- Cookies and sessions over **HTTPS**  
- Subdomains and cookie scope documented for each surface  
- **CORS**: explicit allowlist; never `*` in production  
- Nginx forwards **scheme** and **host** correctly  
- **Upload path**: proxy body limit aligns with API/media limits; MinIO public URLs match intended routing

## Internal Docker networking (rationale)

- **PostgreSQL, Redis, and MinIO** must not be bound to the public Internet. In production Compose they use **`expose`** (or internal ports) on a private Docker network only.  
- **Ingress** is **Nginx** on **80/443** on `pastane_edge`. Nginx is also on **`pastane_internal`** so it can proxy to **MinIO** for `storage.*` hosts without publishing MinIO to the WAN. Application containers (**api**, **web**, **admin**, **courier**) are only **exposed** on the Docker network, not as host port mappings.  
- An **`internal: true`** Docker network prevents accidental outbound egress from data services where Compose supports it; operators still verify with **`ufw`**, **`ss -tlnp`**, and cloud security groups.

See also [production-risk-review.md](production-risk-review.md).

## Docker image versioning

**Policy (default):** aligned **semantic versioning** across services for a given platform release (e.g. `v1.0.0`). Example image names:

- `pastane-api:v1.0.0`  
- `pastane-web:v1.0.0`  
- `pastane-admin:v1.0.0`  
- `pastane-courier:v1.0.0`

**Rules**

- Production deploys use **explicit tags** or **immutable digests**. Do **not** deploy production using **`latest` alone**; `latest` may exist as a convenience tag but must never be the only rollback handle.  
- Set **`IMAGE_TAG`** (and optionally **`REGISTRY`**) in `.env.prod`; [docker-compose.prod.yml](../docker/docker-compose.prod.yml) interpolates image references.  
- **Rollback:** redeploy the previous **`IMAGE_TAG`** (e.g. `v1.0.0` → `v0.9.0`). Run smoke tests and `/api/v1/health`. If a migration is **not** backward-compatible, rolling back images is insufficient—restore the database from backup or run a forward fix (documented in migration policy).

## Deployment flow (Docker Compose)

Typical sequence on the server (after secrets and TLS are in place):

1. **Validate** compose: `pnpm run docker:prod:config` (uses `.env.prod`).  
2. **Build or pull** images for the chosen **`IMAGE_TAG`**.  
3. **Migrations:** before or as part of API startup, run `prisma migrate deploy` (API entrypoint in production images runs this before `node`).  
4. **`docker compose` up** with the production file and `.env.prod`.  
5. **Smoke tests:** health, login, catalog read, optional payment **sandbox** only.

**Operational scripts** (implemented in-repo):

| Script | Purpose |
|--------|---------|
| [scripts/deploy-prod.sh](../scripts/deploy-prod.sh) | Preflight, optional backup hook, deploy forward with explicit tag |
| [scripts/rollback-prod.sh](../scripts/rollback-prod.sh) | Point `IMAGE_TAG` at previous release and recreate services |
| [scripts/backup-prod.sh](../scripts/backup-prod.sh) | Timestamped PostgreSQL + MinIO-oriented backup |
| [scripts/restore-prod.sh](../scripts/restore-prod.sh) | Destructive restore with confirmation |

Details and safety expectations are in the script headers and [production-checklist.md](production-checklist.md).

## Rollback strategy

1. **Application-only:** set **`IMAGE_TAG`** to the last known-good version; `docker compose up -d` (or `rollback-prod.sh`).  
2. **Database drift:** if a bad migration shipped, **restore** from the last backup taken **before** the migration (see [backup-and-restore.md](backup-and-restore.md)).  
3. **Always** verify `/api/v1/health` and critical user paths after rollback.

## Migration strategy

- Migrations live in [packages/database/migrations](../packages/database/migrations).  
- **Deploy order:** take a backup → run **`prisma migrate deploy`** → start or restart API.  
- For zero-doubt production windows, run migrate as a one-off job or entrypoint step that fails fast if migrate fails (API must not serve traffic on a bad schema).

## Smoke-test strategy

Minimal checks:

1. `GET /api/v1/health` — `status` and `services.postgres`, `redis`, `minio`  
   - Through **Nginx**, use the API hostname (e.g. `curl -H 'Host: api.staging.local' http://127.0.0.1/api/v1/health`). The `server_name localhost` block on port **80** proxies to **customer web**, not the API.  
2. Public catalog or category endpoint (unauthenticated)  
3. Auth login on **web**, **admin**, **courier** (role-appropriate)  
4. Optional: Iyzico **sandbox** payment round-trip on staging only

## Production checklist reference

Use [production-checklist.md](production-checklist.md) before declaring go-live.

## Cutover when real domains arrive

1. Obtain DNS A/AAAA records for web, API, admin, courier, and storage.  
2. Issue **Let’s Encrypt** (or provider) certificates; update Nginx `server_name` and `ssl_certificate` paths.  
3. Replace placeholder URLs in `.env.prod`: **`WEB_URL`**, **`API_URL`**, **`ADMIN_URL`**, **`COURIER_URL`**, **`NEXT_PUBLIC_SITE_URL`**, **`MINIO_PUBLIC_URL`**, payment callback URLs per Iyzico docs.  
4. Enable **`SWAGGER_ENABLED=false`** in production.  
5. Verify **CORS** and **cookie** domains.  
6. Run full smoke tests and backup job.  
7. Monitor disk, logs, and health for 24–48 hours.

**Current repository default:** no production domains are assigned; [.env.prod.example](../.env.prod.example) and Nginx examples use **localhost** and **staging.local** placeholders only.
