# Production operations (Host Nginx + Docker Compose)

## Architecture (post Faz 7 — Supabase DB)

```mermaid
flowchart LR
  internet[Internet_80_443]
  nginx[Host_Nginx_on_VPS]
  web[Docker_web_3000_loopback]
  admin[Docker_admin_3001_loopback]
  courier[Docker_courier_3002_loopback]
  api[Docker_api_3003_loopback]
  minio[Docker_minio_9000_loopback]
  supadb[supabase_db_pastane_supabase]
  studio[Supabase_Studio_54323]
  internet --> nginx
  nginx --> web
  nginx --> admin
  nginx --> courier
  nginx --> api
  nginx --> minio
  nginx --> studio
  api --> supadb
  studio --> supadb
```

**Two Docker Compose projects on the VPS:**

| Project | Compose file | Services |
|---------|--------------|----------|
| `supabase-prod` | [`docker/supabase/`](../docker/supabase/) + Pastane overrides | Full Supabase stack (db, studio, kong, …) |
| `pastane-prod` | [`docker/docker-compose.prod.yml`](../docker/docker-compose.prod.yml) | api, web, admin, courier, redis, minio |

- **PostgreSQL (production):** `supabase-db` on network `pastane_supabase` — **no** host port publish.
- **Studio:** https://studio.azem.cloud → Supabase Studio on `127.0.0.1:54323`. See [`supabase-full-self-host-faz-8.0.md`](supabase-full-self-host-faz-8.0.md).
- **Legacy postgres:** stopped (Faz 7.2); volume retained. See [`supabase-legacy-rollback-window.md`](supabase-legacy-rollback-window.md).

Deploy helper: [`deploy.sh`](../deploy.sh) — ensures **supabase-prod** full stack, then app build/up, migrate, health + smoke.

Shared compose helpers: [`scripts/lib/compose-prod.sh`](../scripts/lib/compose-prod.sh).

- **Redis:** Docker internal network only (`pastane_internal`).
- **MinIO S3 API:** `127.0.0.1:9000` for Host Nginx `storage.azem.cloud`.
- Legacy `pull --ff-only` behaviour: `DEPLOY_NO_HARD_RESET=1 ./deploy.sh`.

## Routine deploy on VPS

From your dev machine (**`main`**, temiz çalışma ağacı, `scripts/deploy-vps.env.local` içinde **`VPS_HOST`**):

```bash
pnpm push:vps           # typecheck → git push → SSH ile sunucuda ./deploy.sh
pnpm push:vps:fast      # typecheck atlanır (önce `pnpm typecheck` çalıştırdıysanız)
```

Şablon: [`scripts/deploy-vps.env.example`](../scripts/deploy-vps.env.example).

Sunucuda doğrudan:

```bash
cd /var/www/pastane-app/app
./deploy.sh
```

Deploy sonunda otomatik:

- `scripts/post-deploy-health.sh` (loopback `http://127.0.0.1:3003/health`)
- `scripts/post-deploy-smoke-prod.sh` (read-only `/api/v1/products`)

After Host Nginx + TLS:

```bash
curl -fsS https://api.azem.cloud/health
PROD_API_URL=https://api.azem.cloud bash scripts/post-deploy-smoke-prod.sh
```

## Logs

App stack:

```bash
docker compose --project-name pastane-prod --env-file .env.production \
  -f docker/docker-compose.prod.yml logs --tail=200 api
```

Supabase stack:

```bash
bash scripts/generate-supabase-compose-env.sh .env.production
docker compose --project-name supabase-prod --env-file docker/supabase/.runtime.env \
  -f docker/supabase/docker-compose.yml \
  -f docker/supabase/docker-compose.pg17.yml \
  -f docker/supabase/docker-compose.pastane.prod.yml logs --tail=100 db
```

## Database migrations

Production uses **`prisma migrate deploy` only**, invoked from `deploy.sh`. Requires **`DIRECT_URL`** pointing at `supabase-db`. Do **not** run `prisma migrate dev` on production.

## Studio (Supabase Dashboard)

```bash
bash scripts/setup-studio-vps.sh
```

URL: https://studio.azem.cloud — login via `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD`.

## Backups

Default target is **supabase-db**:

```bash
bash scripts/backup-prod.sh
```

Legacy postgres (archived — container stopped Faz 7.2):

```bash
DB_SERVICE=postgres bash scripts/backup-prod.sh   # only if legacy profile restarted manually
```

See [`scripts/backup-prod.sh`](../scripts/backup-prod.sh), [`docs/backup-and-restore.md`](backup-and-restore.md), [`docs/azem-cloud-vps-deployment.md`](azem-cloud-vps-deployment.md).

## Rollback

- **App images:** [`docs/ROLLBACK_GUIDE.md`](ROLLBACK_GUIDE.md) — `IMAGE_TAG` via `scripts/rollback-prod.sh`
- **Database (legacy):** [`docs/supabase-legacy-rollback-window.md`](supabase-legacy-rollback-window.md) — 7-day window only

## Post-deploy checklist

- [ ] `https://api.azem.cloud/health` → `"status":"ok"`
- [ ] `GET /api/v1/products?limit=1` → 200
- [ ] `docker compose ... ps` — api + supabase-db healthy
- [ ] `prisma migrate status` — no pending migrations
- [ ] Recent backup in `BACKUP_DIR` (< 24h)
- [ ] Legacy postgres intentionally stopped after rollback window ends
