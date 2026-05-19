# Pastane & Fırın Platformu
# Docker Compose — Güncel Geliştirme ve Production Ortamı

**Klasör:** `docker/`  
**Araç:** Docker + Docker Compose v2  
**Sunucu OS:** Ubuntu 24.04 LTS  
**Ortamlar:** Development / Production

---

# 1. Genel Yapı

Tüm servisler Docker Compose ile yönetilecektir.

Development ve production ortamları için ayrı compose dosyaları kullanılacaktır.

```text
docker-compose.dev.yml   → local geliştirme ortamı
docker-compose.prod.yml  → Ubuntu 24.04 LTS VPS production ortamı
```

Production ortamında dış erişim yalnızca Nginx üzerinden yapılacaktır.

PostgreSQL, Redis, MinIO, API ve frontend servisleri dış dünyaya doğrudan açılmayacaktır.

---

# 2. Servis Haritası

```text
                    ┌─────────────────────────────────┐
                    │           NGINX (80/443)         │
                    └──────┬──────┬──────┬─────┬──────┘
                           │      │      │     │
                         web   admin  courier  api
                        :3000  :3001  :3002  :3003
                                                │
                          ┌─────────────────────┤
                          │                     │
                       postgres              redis
                        :5432                :6379
                          │
                        minio
                       :9000/:9001
```

---

# 3. Servisler ve Portlar

| Servis | İç Port | Dış Port Dev | Dış Port Prod | Açıklama |
|---|---:|---:|---:|---|
| postgres | 5432 | 5432 | Kapalı | Ana veritabanı |
| redis | 6379 | 6379 | Kapalı | Cache + BullMQ queue |
| minio | 9000 | 9000 | Nginx üzerinden | S3 uyumlu dosya depolama |
| minio-console | 9001 | 9001 | Tercihen kapalı veya IP kısıtlı | MinIO yönetim arayüzü |
| api | 3003 | 3003 | Nginx üzerinden | NestJS backend API |
| web | 3000 | 3000 | Nginx üzerinden | Next.js müşteri sitesi |
| admin | 3001 | 3001 | Nginx üzerinden | Next.js admin panel |
| courier | 3002 | 3002 | Nginx üzerinden | Next.js kurye paneli |
| nginx | 80/443 | 80/443 | 80/443 | Reverse proxy + SSL |

---

# 4. Klasör Yapısı

```text
docker/
│
├── docker-compose.dev.yml
├── docker-compose.prod.yml
│
├── nginx/
│   ├── nginx.conf
│   ├── conf.d/
│   │   ├── api.conf
│   │   ├── web.conf
│   │   ├── admin.conf
│   │   ├── courier.conf
│   │   └── storage.conf
│   └── ssl/
│       ├── .gitkeep
│       └── README.md
│
├── postgres/
│   └── init.sql
│
└── scripts/
    ├── backup.sh
    ├── restore.sh
    ├── deploy.sh
    └── renew-ssl.sh
```

---

# 5. Environment Dosyaları

Root dizinde örnek environment dosyası bulunacaktır.

```text
.env.example
.env
.env.prod
```

Production ortamında `.env.prod` kullanılacaktır.

---

## 5.1 .env.example

```env
# ============================================================
# UYGULAMA
# ============================================================
NODE_ENV=development
API_PORT=3003
API_URL=http://localhost:3003

# ============================================================
# VERİTABANI
# ============================================================
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=pastane_db
POSTGRES_USER=pastane_user
POSTGRES_PASSWORD=your_strong_password_here
DATABASE_URL=postgresql://pastane_user:your_strong_password_here@postgres:5432/pastane_db

# ============================================================
# REDIS
# ============================================================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_here

# ============================================================
# JWT
# ============================================================
JWT_SECRET=your_jwt_secret_minimum_32_chars_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_refresh_secret_minimum_32_chars_here
JWT_REFRESH_EXPIRES_IN=30d

# ============================================================
# MINIO
# ============================================================
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=your_minio_secret_here
MINIO_BUCKET_PRODUCTS=product-images
MINIO_BUCKET_PUBLIC=public
MINIO_PUBLIC_URL=http://localhost:9000
MINIO_PUBLIC_DOMAIN=https://storage.pastane.com

# ============================================================
# İYZİCO
# ============================================================
IYZICO_API_KEY=your_iyzico_api_key
IYZICO_SECRET_KEY=your_iyzico_secret_key
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com

# ============================================================
# SMS
# ============================================================
SMS_PROVIDER=netgsm
NETGSM_USERCODE=your_netgsm_usercode
NETGSM_PASSWORD=your_netgsm_password
NETGSM_MSGHEADER=PASTANE
OTP_ACTIVE=false

# ============================================================
# FIREBASE FCM
# ============================================================
FCM_PROJECT_ID=your_firebase_project_id
FCM_CLIENT_EMAIL=your_firebase_client_email
FCM_PRIVATE_KEY=your_firebase_private_key

# ============================================================
# E-POSTA
# ============================================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_smtp_password
SMTP_FROM=noreply@pastane.com

# ============================================================
# FRONTEND URL'LERİ
# ============================================================
WEB_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001
COURIER_URL=http://localhost:3002

# ============================================================
# PRODUCTION DOMAINLERİ
# ============================================================
DOMAIN_WEB=pastane.com
DOMAIN_API=api.pastane.com
DOMAIN_ADMIN=admin.pastane.com
DOMAIN_COURIER=courier.pastane.com
DOMAIN_STORAGE=storage.pastane.com

# ============================================================
# BACKUP
# ============================================================
BACKUP_DIR=/var/backups/pastane
BACKUP_RETAIN_DAYS=7
```

---

# 6. docker-compose.dev.yml

Development ortamı için optimize edilmiştir.

Özellikler:

- hot reload aktif
- dış portlar açık
- volume mount aktif
- lokal geliştirme için uygundur

```yaml
name: pastane-dev

services:
  postgres:
    image: postgres:16-alpine
    container_name: pastane_postgres_dev
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
      - ./postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - pastane_dev

  redis:
    image: redis:7-alpine
    container_name: pastane_redis_dev
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    volumes:
      - redis_dev_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - pastane_dev

  minio:
    image: minio/minio:latest
    container_name: pastane_minio_dev
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_dev_data:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - pastane_dev

  api:
    build:
      context: ../
      dockerfile: apps/api/Dockerfile.dev
    container_name: pastane_api_dev
    restart: unless-stopped
    env_file:
      - ../.env
    ports:
      - "3003:3003"
    volumes:
      - ../apps/api:/app/apps/api
      - ../packages:/app/packages
      - /app/node_modules
      - /app/apps/api/node_modules
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    networks:
      - pastane_dev

  web:
    build:
      context: ../
      dockerfile: apps/web/Dockerfile.dev
    container_name: pastane_web_dev
    restart: unless-stopped
    env_file:
      - ../.env
    ports:
      - "3000:3000"
    volumes:
      - ../apps/web:/app/apps/web
      - ../packages:/app/packages
      - /app/node_modules
      - /app/apps/web/node_modules
    depends_on:
      - api
    networks:
      - pastane_dev

  admin:
    build:
      context: ../
      dockerfile: apps/admin/Dockerfile.dev
    container_name: pastane_admin_dev
    restart: unless-stopped
    env_file:
      - ../.env
    ports:
      - "3001:3001"
    volumes:
      - ../apps/admin:/app/apps/admin
      - ../packages:/app/packages
      - /app/node_modules
      - /app/apps/admin/node_modules
    depends_on:
      - api
    networks:
      - pastane_dev

  courier:
    build:
      context: ../
      dockerfile: apps/courier/Dockerfile.dev
    container_name: pastane_courier_dev
    restart: unless-stopped
    env_file:
      - ../.env
    ports:
      - "3002:3002"
    volumes:
      - ../apps/courier:/app/apps/courier
      - ../packages:/app/packages
      - /app/node_modules
      - /app/apps/courier/node_modules
    depends_on:
      - api
    networks:
      - pastane_dev

volumes:
  postgres_dev_data:
  redis_dev_data:
  minio_dev_data:

networks:
  pastane_dev:
    driver: bridge
```

---

# 7. docker-compose.prod.yml

Production ortamı Ubuntu 24.04 LTS üzerinde çalışacaktır.

Özellikler:

- hot reload yoktur
- dış portlar kapalıdır
- yalnızca nginx 80/443 dışarı açılır
- servisler internal network üzerinden haberleşir
- healthcheck zorunludur
- restart policy `always` olarak kullanılır

```yaml
name: pastane-prod

services:
  postgres:
    image: postgres:16-alpine
    container_name: pastane_postgres
    restart: always
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    expose:
      - "5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 30s
    networks:
      - pastane_internal

  redis:
    image: redis:7-alpine
    container_name: pastane_redis
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redis_data:/data
    expose:
      - "6379"
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 30s
      timeout: 10s
      retries: 5
    networks:
      - pastane_internal

  minio:
    image: minio/minio:latest
    container_name: pastane_minio
    restart: always
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    volumes:
      - minio_data:/data
    expose:
      - "9000"
      - "9001"
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 30s
      timeout: 10s
      retries: 5
    networks:
      - pastane_internal

  api:
    build:
      context: ../
      dockerfile: apps/api/Dockerfile.prod
    container_name: pastane_api
    restart: always
    env_file:
      - ../.env.prod
    expose:
      - "3003"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3003/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s
    networks:
      - pastane_internal

  web:
    build:
      context: ../
      dockerfile: apps/web/Dockerfile.prod
    container_name: pastane_web
    restart: always
    env_file:
      - ../.env.prod
    expose:
      - "3000"
    depends_on:
      - api
    networks:
      - pastane_internal

  admin:
    build:
      context: ../
      dockerfile: apps/admin/Dockerfile.prod
    container_name: pastane_admin
    restart: always
    env_file:
      - ../.env.prod
    expose:
      - "3001"
    depends_on:
      - api
    networks:
      - pastane_internal

  courier:
    build:
      context: ../
      dockerfile: apps/courier/Dockerfile.prod
    container_name: pastane_courier
    restart: always
    env_file:
      - ../.env.prod
    expose:
      - "3002"
    depends_on:
      - api
    networks:
      - pastane_internal

  nginx:
    image: nginx:alpine
    container_name: pastane_nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - certbot_data:/var/www/certbot:ro
      - certbot_certs:/etc/letsencrypt:ro
    depends_on:
      - api
      - web
      - admin
      - courier
      - minio
    networks:
      - pastane_internal

  certbot:
    image: certbot/certbot
    container_name: pastane_certbot
    volumes:
      - certbot_data:/var/www/certbot
      - certbot_certs:/etc/letsencrypt
    profiles:
      - ssl

volumes:
  postgres_data:
  redis_data:
  minio_data:
  certbot_data:
  certbot_certs:

networks:
  pastane_internal:
    driver: bridge
```

---

# 8. Nginx Yapılandırması

## 8.1 nginx.conf

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript application/xml image/svg+xml;

    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;

    log_format main '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    keepalive_timeout 65;
    client_max_body_size 20M;

    include /etc/nginx/conf.d/*.conf;
}
```

---

## 8.2 web.conf

```nginx
server {
    listen 80;
    server_name pastane.com www.pastane.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name pastane.com www.pastane.com;

    ssl_certificate     /etc/letsencrypt/live/pastane.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pastane.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://web:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 8.3 api.conf

```nginx
server {
    listen 80;
    server_name api.pastane.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name api.pastane.com;

    ssl_certificate     /etc/letsencrypt/live/pastane.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pastane.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    location /api/v1/auth {
        limit_req zone=auth burst=5 nodelay;
        proxy_pass http://api:3003;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://api:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

---

## 8.4 admin.conf

```nginx
server {
    listen 80;
    server_name admin.pastane.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name admin.pastane.com;

    ssl_certificate     /etc/letsencrypt/live/pastane.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pastane.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    # İsteğe bağlı güvenlik:
    # allow 1.2.3.4;
    # deny all;

    location / {
        proxy_pass http://admin:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 8.5 courier.conf

```nginx
server {
    listen 80;
    server_name courier.pastane.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name courier.pastane.com;

    ssl_certificate     /etc/letsencrypt/live/pastane.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pastane.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://courier:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 8.6 storage.conf

Ürün görsellerinin public erişimi için `storage.pastane.com` kullanılabilir.

```nginx
server {
    listen 80;
    server_name storage.pastane.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name storage.pastane.com;

    ssl_certificate     /etc/letsencrypt/live/pastane.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pastane.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://minio:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Not:

MinIO console production ortamında public açılmamalıdır.

Gerekirse yalnızca VPN/IP kısıtı ile erişime açılmalıdır.

---

# 9. Dockerfile Notları

Monorepo yapısı Turborepo ile yönetileceği için Dockerfile komutları root `package.json` script yapısına göre netleştirilmelidir.

Önerilen yaklaşım:

```text
npm run build --workspace=apps/api
npm run build --workspace=apps/web
npm run build --workspace=apps/admin
npm run build --workspace=apps/courier
```

veya Turborepo ile:

```text
npx turbo run build --filter=api
npx turbo run build --filter=web
npx turbo run build --filter=admin
npx turbo run build --filter=courier
```

Hangi komutun kullanılacağı root package script yapısı oluşturulduktan sonra kesinleştirilmelidir.

---

# 10. Prisma Migration Kararı

Production ortamında migration için şu komut kullanılacaktır:

```bash
npx prisma migrate deploy --schema=packages/database/schema.prisma
```

Önemli:

Prod API image içinde Prisma CLI veya migration çalıştırmaya yetecek bağımlılıklar bulunmalıdır.

Alternatif olarak ayrı bir migration job/container tanımlanabilir.

Önerilen deploy sırası:

```text
1. Yeni image build edilir
2. API geçici olarak eski haliyle çalışmaya devam eder
3. Migration deploy çalıştırılır
4. API yeni image ile restart edilir
5. Web/Admin/Courier güncellenir
```

---

# 11. Health Endpoint Kararı

API healthcheck için backend tarafında şu endpoint mutlaka oluşturulmalıdır:

```text
GET /api/v1/health
```

Bu endpoint şunları kontrol etmelidir:

- API ayakta mı?
- PostgreSQL bağlantısı çalışıyor mu?
- Redis bağlantısı çalışıyor mu?
- MinIO bağlantısı çalışıyor mu?

Örnek response:

```json
{
  "success": true,
  "data": {
    "api": "ok",
    "postgres": "ok",
    "redis": "ok",
    "minio": "ok"
  }
}
```

---

# 12. SSL ve Certbot

İlk SSL alma komutu:

```bash
cd docker

docker compose -f docker-compose.prod.yml --profile ssl run --rm certbot \
  certonly --webroot --webroot-path /var/www/certbot \
  -d pastane.com -d www.pastane.com \
  -d api.pastane.com \
  -d admin.pastane.com \
  -d courier.pastane.com \
  -d storage.pastane.com \
  --email your@email.com --agree-tos --no-eff-email

docker compose -f docker-compose.prod.yml restart nginx
```

---

## 12.1 SSL Yenileme Scripti

`docker/scripts/renew-ssl.sh`

```bash
#!/bin/bash

set -e

cd /path/to/pastane-platform/docker

docker compose -f docker-compose.prod.yml --profile ssl run --rm certbot renew

docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

---

## 12.2 Crontab ile Otomatik SSL Yenileme

```bash
# Her gün 03:30'da sertifika yenilemeyi dener
30 3 * * * /path/to/pastane-platform/docker/scripts/renew-ssl.sh >> /var/log/pastane_ssl_renew.log 2>&1
```

---

# 13. Kullanım Komutları

## 13.1 Development

```bash
cd docker

docker compose -f docker-compose.dev.yml up -d

docker compose -f docker-compose.dev.yml logs -f api

docker compose -f docker-compose.dev.yml down

docker compose -f docker-compose.dev.yml down -v
```

Sadece altyapı servisleri:

```bash
docker compose -f docker-compose.dev.yml up -d postgres redis minio
```

Prisma migration:

```bash
docker compose -f docker-compose.dev.yml exec api \
  npx prisma migrate dev --schema=packages/database/schema.prisma
```

Seed:

```bash
docker compose -f docker-compose.dev.yml exec api \
  npx prisma db seed --schema=packages/database/schema.prisma
```

---

## 13.2 Production

```bash
cd docker

cp ../.env.example ../.env.prod
# .env.prod dosyasını düzenle

docker compose -f docker-compose.prod.yml up -d
```

Migration:

```bash
docker compose -f docker-compose.prod.yml exec api \
  npx prisma migrate deploy --schema=packages/database/schema.prisma
```

Güncelleme deploy:

```bash
git pull

docker compose -f docker-compose.prod.yml build api web admin courier

docker compose -f docker-compose.prod.yml up -d --no-deps api web admin courier

docker compose -f docker-compose.prod.yml exec api \
  npx prisma migrate deploy --schema=packages/database/schema.prisma
```

---

# 14. Yedekleme

## 14.1 backup.sh

Backup scripti `.env.prod` dosyasını okuyacak şekilde hazırlanmalıdır.

```bash
#!/bin/bash

set -e

PROJECT_DIR="/path/to/pastane-platform"
ENV_FILE="$PROJECT_DIR/.env.prod"

if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
else
  echo ".env.prod bulunamadı"
  exit 1
fi

BACKUP_DIR=${BACKUP_DIR:-/var/backups/pastane}
RETAIN_DAYS=${BACKUP_RETAIN_DAYS:-7}
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/pastane_db_$DATE.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$DATE] Yedekleme başlıyor..."

docker exec pastane_postgres pg_dump \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  | gzip > "$BACKUP_FILE"

echo "[$DATE] Yedek oluşturuldu: $BACKUP_FILE"

find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETAIN_DAYS -delete

echo "[$DATE] Eski yedekler temizlendi."
echo "[$DATE] Yedekleme tamamlandı."
```

---

## 14.2 Crontab

```bash
# Her gün gece 02:00'de yedek al
0 2 * * * /path/to/pastane-platform/docker/scripts/backup.sh >> /var/log/pastane_backup.log 2>&1
```

---

## 14.3 restore.sh

```bash
#!/bin/bash

set -e

if [ -z "$1" ]; then
  echo "Kullanım: ./restore.sh /path/to/backup.sql.gz"
  exit 1
fi

PROJECT_DIR="/path/to/pastane-platform"
ENV_FILE="$PROJECT_DIR/.env.prod"

if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
else
  echo ".env.prod bulunamadı"
  exit 1
fi

BACKUP_FILE="$1"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p /var/backups/pastane

echo "[$DATE] Geri yükleme başlıyor: $BACKUP_FILE"

docker exec pastane_postgres pg_dump \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  | gzip > "/var/backups/pastane/pre_restore_$DATE.sql.gz"

gunzip -c "$BACKUP_FILE" | docker exec -i pastane_postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "[$DATE] Geri yükleme tamamlandı."
```

---

# 15. Domain ve DNS Yapılandırması

Production'da kullanılacak subdomain yapısı:

| Domain | Servis | Açıklama |
|---|---|---|
| pastane.com | web | Müşteri sitesi |
| www.pastane.com | web | Müşteri sitesi |
| api.pastane.com | api | Backend API |
| admin.pastane.com | admin | Yönetim paneli |
| courier.pastane.com | courier | Kurye paneli |
| storage.pastane.com | minio | Public ürün görselleri |

Tüm domain/subdomain kayıtları VPS IP adresine A kaydı olarak yönlendirilmelidir.

---

# 16. Ubuntu 24.04 LTS VPS Kurulum Adımları

```bash
# Sistem güncelle
sudo apt update && sudo apt upgrade -y

# Temel paketler
sudo apt install -y ca-certificates curl gnupg git ufw

# Docker kur
curl -fsSL https://get.docker.com | sh

# Kullanıcıyı docker grubuna ekle
sudo usermod -aG docker $USER

# Oturumu kapatıp tekrar aç veya:
newgrp docker

# Docker Compose v2 kontrol
docker compose version

# Firewall ayarları
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Repo çek
git clone https://github.com/your-org/pastane-platform.git
cd pastane-platform

# Env hazırla
cp .env.example .env.prod
nano .env.prod

# Servisleri başlat
cd docker
docker compose -f docker-compose.prod.yml up -d

# Migration çalıştır
docker compose -f docker-compose.prod.yml exec api \
  npx prisma migrate deploy --schema=packages/database/schema.prisma
```

---

# 17. VPS Gereksinimleri

| Kaynak | Minimum | Önerilen |
|---|---:|---:|
| CPU | 2 vCore | 4 vCore |
| RAM | 4 GB | 8 GB |
| Disk | 40 GB SSD | 80 GB SSD |
| OS | Ubuntu 24.04 LTS | Ubuntu 24.04 LTS |

Not:

Next.js, NestJS, PostgreSQL, Redis ve MinIO aynı VPS üzerinde çalışacağı için production ortamında 8 GB RAM önerilir.

---

# 18. Güvenlik Notları

Production ortamında:

- PostgreSQL dışarı açılmamalıdır
- Redis dışarı açılmamalıdır
- MinIO console public açılmamalıdır
- Admin panel IP kısıtı veya VPN ile korunabilir
- `.env.prod` asla repoya commit edilmemelidir
- JWT secret ve DB password güçlü olmalıdır
- düzenli backup alınmalıdır
- SSL otomatik yenileme kurulmalıdır
- sunucuda yalnızca 22, 80 ve 443 portları açık olmalıdır

---

# 19. Nihai Karar Özeti

| Konu | Karar |
|---|---|
| Sunucu OS | Ubuntu 24.04 LTS |
| Ortam ayrımı | dev / prod compose dosyaları |
| Dış erişim | yalnızca Nginx |
| SSL | Let's Encrypt + Certbot |
| SSL yenileme | cron + renew script |
| Veritabanı | PostgreSQL 16 Alpine |
| Cache/Queue | Redis 7 Alpine |
| Storage | MinIO |
| API | NestJS, 3003 |
| Web | Next.js, 3000 |
| Admin | Next.js, 3001 |
| Courier | Next.js, 3002 |
| Healthcheck | `/api/v1/health` |
| Migration | `prisma migrate deploy` |
| Backup | günlük pg_dump + 7 gün saklama |
| Public storage | `storage.pastane.com` |
| Firewall | SSH + 80 + 443 |

---

# 20. Genel Sonuç

Bu Docker yapısı proje için:

- local geliştirme,
- production deployment,
- SSL yönetimi,
- yedekleme,
- servis izolasyonu,
- güvenli dış erişim,
- MinIO public görsel erişimi,
- Prisma migration yönetimi,
- Ubuntu 24.04 LTS uyumu

sağlayacak şekilde güncellenmiştir.

Bu yapı başlangıçta tek VPS üzerinde çalışmak için uygundur.

Trafik ve sipariş hacmi arttığında servisler daha sonra ayrı sunuculara veya managed servislere taşınabilecek şekilde tasarlanmıştır.

