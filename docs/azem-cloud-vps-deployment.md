# azem.cloud VPS deployment runbook (Host Nginx + Docker)

This runbook prepares the Pastane platform for production on **azem.cloud** using:

- **Docker Compose** — two projects:
  - `supabase-prod` ([`docker/docker-compose.supabase.prod.yml`](../docker/docker-compose.supabase.prod.yml)) — production PostgreSQL (`supabase-db`)
  - `pastane-prod` ([`docker/docker-compose.prod.yml`](../docker/docker-compose.prod.yml)) — API, Redis, MinIO, Next.js surfaces
- **Host Nginx on the VPS** — public **80/443** termination and reverse proxy to **loopback-bound** Docker ports (**not** Docker’s `nginx` image).

Operational overview: [`OPERATIONS.md`](OPERATIONS.md)  
GitHub Actions SSH: [`GITHUB_CI_SSH.md`](GITHUB_CI_SSH.md)

## DNS

Create A records pointing to the VPS public IP `76.13.14.43`:

| Host | Type | Value |
|------|------|--------|
| `azem.cloud` | A | `76.13.14.43` |
| `www.azem.cloud` | A | `76.13.14.43` |
| `api.azem.cloud` | A | `76.13.14.43` |
| `admin.azem.cloud` | A | `76.13.14.43` |
| `courier.azem.cloud` | A | `76.13.14.43` |
| `storage.azem.cloud` | A | `76.13.14.43` |

```bash
dig +short azem.cloud
dig +short api.azem.cloud
dig +short admin.azem.cloud
dig +short courier.azem.cloud
dig +short storage.azem.cloud
```

Resolve to `76.13.14.43` **before** requesting certificates.

## SSH

Replace with your deployment user:

```bash
ssh deploy@76.13.14.43
```

## VPS base setup

Ubuntu 24.04 LTS with Docker Engine **and** Host Nginx for TLS + proxying:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git ufw nginx certbot python3-certbot-nginx
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc >/dev/null
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker deploy
```

Log out/in after Docker group membership.

### Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status verbose
```

**Do not** publish PostgreSQL, Redis, or MinIO (`9001` console) on `0.0.0.0`. Loopback binds from Compose are fine for nginx on the **same host**. See Compose `127.0.0.1:…` port mappings.

## Deploy directory & clone

```bash
sudo mkdir -p /var/www/pastane-app
sudo chown -R deploy:deploy /var/www/pastane-app
cd /var/www/pastane-app

# If `app` is not a repo:
# mv app app-backup-$(date +%Y%m%d-%H%M%S)
git clone git@github.com:firatemu/Pastane.git app
cd app
```

## `.env.production`

```bash
cp .env.production.example .env.production
chmod 600 .env.production
nano .env.production
```

Replace placeholders (`POSTGRES_*`, `DATABASE_URL`, `REDIS_PASSWORD`, JWT secrets, MinIO keys, etc.).  
[`deploy.sh`](../deploy.sh) **refuses** to run if `.env.production` still contains `change_me` or `placeholder`.

Public URLs (example):

```env
API_URL=https://api.azem.cloud
PUBLIC_API_URL=https://api.azem.cloud
NEXT_PUBLIC_API_URL=https://api.azem.cloud
WEB_URL=https://azem.cloud
ADMIN_URL=https://admin.azem.cloud
COURIER_URL=https://courier.azem.cloud
MINIO_PUBLIC_URL=https://storage.azem.cloud
MINIO_PUBLIC_DOMAIN=https://storage.azem.cloud
NEXT_PUBLIC_SITE_URL=https://azem.cloud
CORS_ORIGINS=https://azem.cloud,https://www.azem.cloud,https://admin.azem.cloud,https://courier.azem.cloud
```

## TLS before enabling HTTPS vhosts

The checked-in Host Nginx file [`deploy/nginx/pastane-app`](../deploy/nginx/pastane-app) expects certs at `/etc/letsencrypt/live/azem.cloud/`.

**Option A — certbot standalone** (works when nothing listens on `:80`): stop nginx briefly, obtain cert for all hosts, restart nginx:

```bash
sudo systemctl stop nginx
sudo certbot certonly --standalone \
  -d azem.cloud -d www.azem.cloud \
  -d api.azem.cloud -d admin.azem.cloud -d courier.azem.cloud -d storage.azem.cloud
sudo systemctl start nginx
```

**Option B** — staged HTTP-only nginx for HTTP-01 (`/.well-known/…`) via `sudo certbot --nginx` once a minimal `:80` vhost exists. See [`deploy/nginx/README.md`](../deploy/nginx/README.md).

## Host Nginx config

Install the HTTPS vhosts (adjust filename if desired):

```bash
sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
sudo install -o root -m 0644 /var/www/pastane-app/app/deploy/nginx/pastane-app \
  /etc/nginx/sites-available/pastane-app.conf
sudo ln -sf /etc/nginx/sites-available/pastane-app.conf /etc/nginx/sites-enabled/pastane-app.conf
sudo nginx -t && sudo systemctl reload nginx
```

## First stack bring-up (`deploy.sh`)

```bash
cd /var/www/pastane-app/app
chmod +x deploy.sh
./deploy.sh
```

`deploy.sh` ensures **supabase-db** is running, then builds/starts the app stack and runs **`prisma migrate deploy`** (never `migrate dev`) using **`DIRECT_URL`**.

Post-deploy checks run automatically (health + read-only smoke). Skip with `SKIP_POST_DEPLOY_CHECKS=1 ./deploy.sh` if needed.

## Smoke checks

```bash
curl -fsS http://127.0.0.1:3003/health
curl -fsS https://api.azem.cloud/health
PROD_API_URL=https://api.azem.cloud bash scripts/post-deploy-smoke-prod.sh
curl -I https://azem.cloud
curl -I https://admin.azem.cloud
curl -I https://courier.azem.cloud
curl -I https://storage.azem.cloud
```

## Certbot renewal + reload Host Nginx

```bash
sudo certbot renew --dry-run
```

Deploy hook reloads nginx after renewal:

```bash
sudo mkdir -p /etc/letsencrypt/renewal-hooks/deploy
sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-pastane-host-nginx >/dev/null <<'EOF'
#!/usr/bin/env bash
systemctl reload nginx
EOF
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-pastane-host-nginx
```

## Backups & updates

See [`OPERATIONS.md`](OPERATIONS.md) and [`backup-and-restore.md`](backup-and-restore.md).

```bash
cd /var/www/pastane-app/app
bash scripts/backup-prod.sh
./deploy.sh
curl -fsS https://api.azem.cloud/health
```

`deploy.sh` already fetches **`origin/main`** and **resets** the working tree to match (replacing stray local file edits such as patched `package.json` on the server). Set `DEPLOY_NO_HARD_RESET=1` before running only if you intentionally need the older merge/pull flow.
