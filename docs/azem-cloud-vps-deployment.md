# azem.cloud VPS Deployment Runbook

This runbook prepares the Pastane platform for production on `azem.cloud`.

## DNS

Create A records pointing to the VPS public IP:

- `azem.cloud`
- `www.azem.cloud`
- `api.azem.cloud`
- `admin.azem.cloud`
- `courier.azem.cloud`
- `storage.azem.cloud`

Wait until every hostname resolves to the VPS:

```bash
dig +short azem.cloud
dig +short api.azem.cloud
dig +short admin.azem.cloud
dig +short courier.azem.cloud
dig +short storage.azem.cloud
```

## VPS Base Setup

Use Ubuntu 24.04 LTS with Docker Engine and Compose V2.

```bash
sudo apt update
sudo apt install -y ca-certificates curl git ufw certbot
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc >/dev/null
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
```

Log out and back in after adding the Docker group.

## Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status verbose
```

Do not expose PostgreSQL, Redis, MinIO, API, admin, courier, or web ports directly.

## Deploy User Directory

```bash
mkdir -p ~/apps
cd ~/apps
git clone git@github.com:firatemu/Pastane.git
cd Pastane
```

## Production Env

```bash
cp .env.prod.example .env.prod
chmod 600 .env.prod
```

Edit `.env.prod` and replace every placeholder secret:

- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `REDIS_PASSWORD`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- payment, SMS, SMTP, and FCM values when available

Generate strong values:

```bash
openssl rand -base64 48
```

Keep these public URL values for `azem.cloud`:

```env
API_URL=https://api.azem.cloud
PUBLIC_API_URL=https://api.azem.cloud
WEB_URL=https://azem.cloud
ADMIN_URL=https://admin.azem.cloud
COURIER_URL=https://courier.azem.cloud
MINIO_PUBLIC_URL=https://storage.azem.cloud
MINIO_PUBLIC_DOMAIN=https://storage.azem.cloud
NEXT_PUBLIC_SITE_URL=https://azem.cloud
```

## First HTTP Boot

Start the stack on HTTP so Let's Encrypt can validate ACME challenges:

```bash
bash scripts/deploy-prod.sh
curl -fsS -H 'Host: api.azem.cloud' http://127.0.0.1/api/v1/health
```

## Certificates

Issue one certificate covering all public hostnames:

```bash
sudo certbot certonly --webroot \
  -w /home/$USER/apps/Pastane/docker/nginx/certbot-webroot \
  -d azem.cloud \
  -d www.azem.cloud \
  -d api.azem.cloud \
  -d admin.azem.cloud \
  -d courier.azem.cloud \
  -d storage.azem.cloud
```

Switch Nginx to HTTPS:

```bash
cp docker/nginx/conf.d/pastane.ssl.conf.example docker/nginx/conf.d/pastane.conf
docker compose --env-file .env.prod -f docker/docker-compose.prod.yml restart nginx
```

## Smoke Tests

```bash
curl -fsS https://api.azem.cloud/api/v1/health
curl -I https://azem.cloud
curl -I https://admin.azem.cloud
curl -I https://courier.azem.cloud
curl -I https://storage.azem.cloud
```

Then verify in browser:

- customer storefront loads at `https://azem.cloud`
- admin login loads at `https://admin.azem.cloud`
- courier login loads at `https://courier.azem.cloud`
- customer login, catalog, cart, and order creation work

## Renewals

Certbot installs a systemd renewal timer. Add this deploy hook so Nginx reloads after renewal:

```bash
sudo mkdir -p /etc/letsencrypt/renewal-hooks/deploy
sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-pastane-nginx >/dev/null <<'EOF'
#!/usr/bin/env bash
docker compose --env-file /home/azem/apps/Pastane/.env.prod -f /home/azem/apps/Pastane/docker/docker-compose.prod.yml restart nginx
EOF
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-pastane-nginx
```

## Backups

Run a backup after first successful deployment:

```bash
bash scripts/backup-prod.sh
```

Add a nightly cron:

```bash
crontab -e
```

```cron
15 3 * * * cd /home/azem/apps/Pastane && bash scripts/backup-prod.sh >> /var/log/pastane-backup.log 2>&1
```

## Update Flow

```bash
cd /home/azem/apps/Pastane
git pull --ff-only origin main
bash scripts/backup-prod.sh
bash scripts/deploy-prod.sh
curl -fsS https://api.azem.cloud/api/v1/health
```
