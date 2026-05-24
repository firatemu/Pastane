# Host Nginx snippets (azem.cloud)

Production exposes **Docker app ports only on `127.0.0.1`** (see `docker/docker-compose.prod.yml`). Traffic from the Internet hits **nginx on the VPS** (ports **80 / 443**), which proxies to those loopback ports.

**Developer workstation:** Yerelde üretim stack’i çalıştırılmaz (`localhost:3000` doğrudan **docker-compose.dev** vitrinidir). Eskiden `:3000` için çakışmayı gidermek `WEB_PROD_HOST_WEB_PORT` ile VPS Compose’ta yapılabilir — **geliştiricide prod Compose kullanılmıyorsa etkisiz**.

## Files

| File | Purpose |
|------|---------|
| [`pastane-app`](pastane-app) | Full HTTPS vhosts for `azem.cloud`, APIs, Next apps, and `storage.azem.cloud` → MinIO on `127.0.0.1:9000`. Requires existing Let’s Encrypt certs at `/etc/letsencrypt/live/azem.cloud/`. |
| [`pastane-studio.conf`](pastane-studio.conf) | Supabase Studio at `https://studio.azem.cloud` → `127.0.0.1:54323`. Install via `bash scripts/setup-studio-vps.sh` on the VPS. |
| [`pastane-studio.conf.example`](pastane-studio.conf.example) | IP-whitelist variant (optional hardening). |

## Bootstrap order (recommended)

**Option A — `certbot certonly --standalone`** (nothing bound on 80/443 yet):

1. Stop/disable any nginx: `sudo systemctl stop nginx`
2. Issue cert for all hosts (includes `storage.azem.cloud` if used).
3. Start nginx again and install [`pastane-app`](pastane-app).
4. `sudo nginx -t && sudo systemctl reload nginx`

**Option B — HTTP-only nginx first**: serve `/.well-known/acme-challenge/` and proxy backends on port **80**, then replace with HTTPS config once certificates exist. See [`docs/azem-cloud-vps-deployment.md`](../../docs/azem-cloud-vps-deployment.md).
