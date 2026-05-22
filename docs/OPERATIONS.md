# Production operations (Host Nginx + Docker Compose)

## Architecture

```mermaid
flowchart LR
  internet[Internet_80_443]
  nginx[Host_Nginx_on_VPS]
  web[Docker_web_3000_loopback]
  admin[Docker_admin_3001_loopback]
  courier[Docker_courier_3002_loopback]
  api[Docker_api_3003_loopback]
  minio[Docker_minio_9000_loopback]
  internet --> nginx
  nginx --> web
  nginx --> admin
  nginx --> courier
  nginx --> api
  nginx --> minio
```

- **PostgreSQL, Redis**: Docker internal network only (`pastane_internal`); **no** host port publish.
- **MinIO S3 API**: `127.0.0.1:9000` for Host Nginx `storage.azem.cloud` (compose publishes loopback-only).

Compose file: [`docker/docker-compose.prod.yml`](../docker/docker-compose.prod.yml)

Deploy helper: [`deploy.sh`](../deploy.sh) — syncs `main` to **`origin/main`** (`git fetch` + `reset --hard` by default so stray VPS edits never block deploy), then `docker compose build`, `up -d`, `prisma migrate deploy`. Legacy `pull --ff-only` behaviour: `DEPLOY_NO_HARD_RESET=1 ./deploy.sh` (fails when the repo is dirty).

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
curl -fsS http://127.0.0.1:3003/health
```

After Host Nginx + TLS:

```bash
curl -fsS https://api.azem.cloud/health
```

## Logs

```bash
docker compose --project-name pastane-prod --env-file .env.production \
  -f docker/docker-compose.prod.yml logs --tail=200 api
```

## Database migrations

Production uses **`prisma migrate deploy` only**, invoked from `deploy.sh`. Do **not** run `prisma migrate dev` on production.

## Backups

See [`backup-db.sh`](../backup-db.sh) and [`docs/azem-cloud-vps-deployment.md`](azem-cloud-vps-deployment.md).
