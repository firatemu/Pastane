# Faz 6.5 — Production Supabase Cutover Hazırlık Planı

**Durum:** Analiz / runbook — henüz VPS deploy yapılmadı  
**Ön koşul:** Local Supabase geçişi (Faz 1–6) tamamlandı  
**İlgili dokümanlar:** [`supabase-migration-prompt.md`](./supabase-migration-prompt.md), [`backup-and-restore.md`](./backup-and-restore.md), [`azem-cloud-vps-deployment.md`](./azem-cloud-vps-deployment.md)

---

## Özet

Bu doküman, **canlı VPS cutover öncesi** production Supabase geçişi için riskleri, dosya değişikliklerini, backup/rollback planını ve dry-run komutlarını netleştirir.

**Kapsam dışı (değişmeyecek):**

- NestJS JWT auth
- MinIO storage
- Redis + BullMQ
- API endpoint sözleşmeleri (`https://api.azem.cloud`)
- Mobil / web / admin / courier istemci URL’leri
- İyzico entegrasyon kodu (yalnızca downtime sırasında callback timing riski)

**Local deneyimden kritik dersler:**

- Prisma `directUrl` zorunlu (`schema.prisma` güncellendi).
- Local Supavisor/pgBouncer Prisma ile uyumsuz (`Tenant or user not found`) — **ilk prod cutover doğrudan Postgres bağlantısı ile yapılmalı**.
- Prisma migration sayısı: **9** (dokümanda 8 yazan eski referans; `_prisma_migrations` 9 satır beklenir).
- Local Supabase CLI PG **17** kullanıyor; prod hâlâ **PG 16** (`postgres:16-alpine`).

---

## 1. VPS Supabase mimari planı

### Hedef mimari

```
Internet
   │
   ▼
Host Nginx (80/443) — deploy/nginx/pastane-app
   ├── azem.cloud          → 127.0.0.1:3000  (web)
   ├── api.azem.cloud      → 127.0.0.1:3003  (api)
   ├── admin.azem.cloud    → 127.0.0.1:3001  (admin)
   ├── courier.azem.cloud  → 127.0.0.1:3002  (courier)
   ├── storage.azem.cloud  → 127.0.0.1:9000  (minio)
   └── studio.azem.cloud   → 127.0.0.1:54323 (supabase studio, IP whitelist)

docker-compose.prod.yml (pastane-prod)
   ├── api      ──┬── redis (internal)
   │              ├── minio (internal + 127.0.0.1:9000)
   │              └── supabase-db (shared Docker network)
   ├── web / admin / courier → http://api:3003 (BFF)

docker-compose.supabase.prod.yml (supabase-prod) — YENİ
   ├── supabase-db     (PostgreSQL, internal :5432)
   ├── supabase-meta   (Studio metadata)
   ├── supabase-studio (127.0.0.1:54323)
   └── supabase-kong   (opsiyonel, 127.0.0.1:8000 — REST kullanılmıyor)

KAPALI: auth, realtime, storage, imgproxy, inbucket, vector, edge-functions
```

### Tasarım kararları

| Karar | Gerekçe |
|-------|---------|
| İki ayrı Compose projesi | Uygulama (`pastane-prod`) ve DB (`supabase-prod`) bağımsız lifecycle; rollback kolay |
| Paylaşılan Docker network | API hem `pastane_internal` hem `supabase_internal` ağına bağlanır |
| Eski `postgres_data` volume silinmez | Cutover sonrası en az 7 gün rollback için saklanır |
| RLS kapalı | Güvenlik NestJS katmanında kalır |
| Studio public internete açık değil | Yalnızca loopback + Nginx IP whitelist / VPN |

### Bağlantı modeli (önerilen ilk cutover)

API container içinden (Docker DNS):

```env
DATABASE_URL=postgresql://pastane_user:SECRET@supabase-db:5432/pastane_db
DIRECT_URL=postgresql://pastane_user:SECRET@supabase-db:5432/pastane_db
```

- `DATABASE_URL` → runtime (Prisma Client)
- `DIRECT_URL` → `prisma migrate deploy` (API entrypoint + `deploy.sh` her start’ta çalıştırır)
- **pgBouncer / Supavisor:** cutover sonrası ayrı test fazında; ilk cutover’da kullanma

### PG sürümü

| Ortam | Sürüm |
|-------|-------|
| Mevcut prod | PostgreSQL 16 (`postgres:16-alpine`) |
| Local Supabase CLI | PostgreSQL 17 |
| Önerilen prod Supabase | **PG 16 ile hizala** veya cutover öncesi staging’de `pg_dump` 16→17 restore testi |

---

## 2. Hangi servisler kalacak / değişecek

| Servis | Cutover sonrası | Değişiklik |
|--------|-----------------|------------|
| **api** | Kalır | `depends_on: postgres` kaldırılır; Supabase DB’ye bağlanır; env güncellenir |
| **web / admin / courier** | Kalır | Env değişmez (`WEB_API_URL=http://api:3003`) |
| **redis** | Kalır | BullMQ `payment_timeout` aynı |
| **minio** | Kalır | Ürün/banner görselleri etkilenmez |
| **postgres (pastane)** | Durdurulur | Volume korunur; yerini `supabase-db` alır |
| **supabase-db** | Yeni | Mevcut PG’nin yerini alır |
| **supabase-studio** | Yeni (ops) | DB yönetim UI |
| **supabase-meta** | Yeni | Studio metadata |
| **supabase-kong** | Opsiyonel | REST/GraphQL kullanılmıyor |
| **auth / realtime / storage / imgproxy / inbucket / vector** | Kapalı | Kullanılmıyor |
| **Host Nginx** | Kalır + genişler | Studio subdomain + IP whitelist |
| **Mobil (Expo)** | Etkilenmez | `https://api.azem.cloud` |
| **İyzico callback** | URL aynı | Downtime sırasında callback kaybı riski |

---

## 3. Port çakışma analizi

### Mevcut VPS portları

| Port | Kullanım | Public? |
|------|----------|---------|
| 80, 443 | Nginx | Evet |
| 3000 | `pastane_web_prod` | Loopback |
| 3001 | admin | Loopback |
| 3002 | courier | Loopback |
| 3003 | api | Loopback |
| 9000 | MinIO API | Loopback |
| 5432, 6379 | postgres / redis prod | Internal only |

### Supabase self-hosted (CLI local portları değil)

| Supabase servisi | Default | VPS riski | Öneri |
|------------------|---------|-----------|-------|
| Postgres | 5432 internal | Yok (host’a bind etme) | Sadece Docker network |
| Supavisor (transaction) | 6543 | Yok | İlk cutover’da kapalı |
| Kong HTTP | 8000 | Yok | `127.0.0.1:8000` veya internal |
| Kong HTTPS | 8443 | Yok | Internal |
| **Studio** | **3000** | **ÇAKIŞMA — web prod ile aynı** | **`127.0.0.1:54323`** |
| CLI portları (54321–54329) | Local only | VPS’te kullanılmaz | N/A |

**Sonuç:** Tek kritik çakışma Studio default `:3000`. Prod web zaten `127.0.0.1:3000` kullanıyor. Studio mutlaka farklı loopback porta alınmalı.

---

## 4. Production env listesi

### Değişecek (VPS `.env.production`)

| Key | Mevcut | Cutover sonrası (taslak) |
|-----|--------|--------------------------|
| `POSTGRES_HOST` | `postgres` | `supabase-db` |
| `POSTGRES_PORT` | `5432` | `5432` |
| `POSTGRES_DB` | `pastane_db` | `pastane_db` |
| `POSTGRES_USER` | `pastane_user` | `pastane_user` (veya Supabase `postgres` — tek karar, dump ile uyumlu) |
| `POSTGRES_PASSWORD` | mevcut secret | yeni DB secret |
| `DATABASE_URL` | `@postgres:5432/pastane_db` | `@supabase-db:5432/pastane_db` |
| `DIRECT_URL` | `@postgres:5432/...` | `@supabase-db:5432/...` |

### Değişmeyecek

| Key | Değer (örnek) |
|-----|---------------|
| `API_URL`, `PUBLIC_API_URL`, `NEXT_PUBLIC_API_URL` | `https://api.azem.cloud` |
| `WEB_URL`, `ADMIN_URL`, `COURIER_URL` | Mevcut domain’ler |
| `CORS_ORIGINS` | Mevcut |
| `WEB_API_URL`, `ADMIN_API_URL`, `COURIER_API_URL` | `http://api:3003` |
| `REDIS_*` | Aynı |
| `MINIO_*` | Aynı |
| `JWT_*` | Aynı |
| `IYZICO_*` | Aynı |
| `PAYMENT_DEV_AUTO_SUCCESS` | `false` (zorunlu) |
| `PAYMENT_TIMEOUT_MS` | Aynı |
| `BACKUP_DIR`, `BACKUP_RETAIN_DAYS` | Aynı |

### Eklenmeyecek

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `service_role` — backend kullanmıyor; repoya / frontend’e gitmemeli.

### `validate-env.sh` zorunlu alanlar

`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `PAYMENT_DEV_AUTO_SUCCESS != true`

---

## 5. Backup komutları

### Cutover öncesi zorunlu (mevcut `postgres` ayaktayken)

```bash
cd /var/www/pastane-app/app

# Otomatik script (önerilen)
bash scripts/backup-prod.sh
# Çıktı: ${BACKUP_DIR}/pastane-pg-YYYYMMDDTHHMMSSZ.dump
```

### Manuel alternatif

```bash
docker compose --env-file .env.production -f docker/docker-compose.prod.yml \
  exec -T postgres pg_dump -U pastane_user -d pastane_db -Fc \
  -f /tmp/backup-pre-supabase.dump

docker compose --env-file .env.production -f docker/docker-compose.prod.yml \
  cp postgres:/tmp/backup-pre-supabase.dump \
  /var/backups/pastane/backup-pre-supabase-$(date +%Y%m%d-%H%M%S).dump
```

### Ek güvenlik (önerilen)

```bash
# Volume bilgisi (silme — rollback için sakla)
docker volume inspect pastane-prod_postgres_data

# MinIO — DB cutover MinIO’yu etkilemez; büyük değişiklik yoksa opsiyonel
# Bkz. docs/backup-and-restore.md — mc mirror veya volume snapshot
```

### Dry-run (zararsız kontroller)

```bash
docker compose --env-file .env.production -f docker/docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker/docker-compose.prod.yml exec -T postgres \
  pg_isready -U pastane_user -d pastane_db
df -h /var/backups/pastane
free -m
docker system df
```

---

## 6. Restore komutları

### A) Eski postgres’e rollback (birincil rollback)

```bash
cd /var/www/pastane-app/app

# API yazmayı durdur
docker compose --env-file .env.production -f docker/docker-compose.prod.yml stop api

# Eski postgres’i geri aç (.env.production eski DATABASE_URL/DIRECT_URL ile)
docker compose --env-file .env.production -f docker/docker-compose.prod.yml up -d postgres

# Mevcut script (destructive)
DUMP_FILE=/var/backups/pastane/pastane-pg-XXXXXXXX.dump \
  CONFIRM=YES bash scripts/restore-prod.sh
```

### Manuel rollback

```bash
docker compose --env-file .env.production -f docker/docker-compose.prod.yml \
  exec -T postgres psql -U pastane_user -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='pastane_db' AND pid <> pg_backend_pid();"

docker compose --env-file .env.production -f docker/docker-compose.prod.yml \
  exec -T postgres psql -U pastane_user -d postgres -c "DROP DATABASE IF EXISTS pastane_db;"

docker compose --env-file .env.production -f docker/docker-compose.prod.yml \
  exec -T postgres psql -U pastane_user -d postgres -c "CREATE DATABASE pastane_db;"

docker compose --env-file .env.production -f docker/docker-compose.prod.yml \
  cp /var/backups/pastane/backup-pre-supabase-XXXX.dump postgres:/tmp/restore.dump

docker compose --env-file .env.production -f docker/docker-compose.prod.yml \
  exec -T postgres pg_restore -U pastane_user -d pastane_db --no-owner /tmp/restore.dump

docker compose --env-file .env.production -f docker/docker-compose.prod.yml up -d
```

### B) Supabase DB’ye veri yükleme (cutover sırasında)

**Önerilen — full logical restore (schema + data + `_prisma_migrations`):**

```bash
# Supabase stack ayakta, API durdurulmuş
docker compose --project-name supabase-prod -f docker/docker-compose.supabase.prod.yml \
  exec -T supabase-db pg_restore -U postgres -d pastane_db --no-owner --clean --if-exists \
  /tmp/backup-pre-supabase.dump
```

**Alternatif — schema migrate + data-only (riskli, schema birebir ise):**

```bash
# 1) prisma migrate deploy (boş Supabase DB)
# 2) pg_dump --data-only from old → pg_restore to new
```

> **Not:** `scripts/backup-prod.sh` ve `scripts/restore-prod.sh` şu an `postgres` servis adına bağlı. Faz 7 implementasyonunda `supabase-db` desteği eklenmeli.

---

## 7. Cutover adımları

| # | Adım | Downtime? |
|---|------|-----------|
| 0 | Local Faz 1–6 yeşil; `main`’e merge; compose draft’ları hazır | Hayır |
| 1 | Bakım penceresi duyurusu (10–30 dk) | — |
| 2 | `bash scripts/backup-prod.sh` + dump off-site kopyala | Hayır |
| 3 | `docker compose ... stop api` | **Evet** |
| 4 | Son incremental dump (opsiyonel, API durduktan sonra) | Evet |
| 5 | Supabase stack başlat (`docker-compose.supabase.prod.yml up -d`) | Evet |
| 6 | `pg_restore` veya `migrate deploy` + veri taşıma | Evet |
| 7 | `.env.production` → yeni `DATABASE_URL` / `DIRECT_URL` | Evet |
| 8 | `docker-compose.prod.yml` → postgres kaldır, API network güncelle | Evet |
| 9 | `bash scripts/validate-env.sh .env.production` | Evet |
| 10 | `docker compose ... build api && up -d` | Evet |
| 11 | `prisma migrate deploy` (`deploy.sh` otomatik çalıştırır) | Evet |
| 12 | Health + smoke test (Bölüm 9) | Evet |
| 13 | Eski `postgres` durdur; **`postgres_data` volume silme** | Hayır |
| 14 | 24–72 saat izleme; eski volume rollback hazır tut | Hayır |

### Deploy akışı etkisi

| Script | Cutover günü |
|--------|--------------|
| [`deploy.sh`](../deploy.sh) | `git pull` → build → `up -d` → `prisma migrate deploy` — sıra kontrolü için **manuel runbook tercih edilmeli** |
| [`scripts/push-vps.sh`](../scripts/push-vps.sh) | Otomatik deploy downtime sırasını kontrol etmez — cutover günü dikkatli kullan |
| [`docker/docker-entrypoint-api.sh`](../docker/docker-entrypoint-api.sh) | Her API start’ta `migrate deploy` — `DIRECT_URL` VPS’te set olmalı |

---

## 8. Rollback adımları

| Senaryo | Aksiyon | Veri riski |
|---------|---------|------------|
| Cutover başarısız (restore öncesi) | Supabase durdur; eski env; `postgres` + volume ile `up -d` | Yok |
| Cutover sonrası kısa süre | Aynı + pre-cutover dump restore | Cutover sonrası yazılar kaybolur |
| Uygulama bug (DB sağlam) | `pnpm deploy:rollback --from-previous-tag` | DB etkilenmez |
| Supabase DB bozuk | Eski postgres volume + dump restore | Veri kaybı riski |

### Rollback komut özeti

```bash
docker compose --project-name supabase-prod -f docker/docker-compose.supabase.prod.yml down

# .env.production → legacy DATABASE_URL/DIRECT_URL @postgres:5432

docker compose --env-file .env.production -f docker/docker-compose.prod.yml up -d postgres

CONFIRM=YES DUMP_FILE=/var/backups/pastane/backup-pre-supabase-XXXX.dump \
  bash scripts/restore-prod.sh

docker compose --env-file .env.production -f docker/docker-compose.prod.yml up -d

pnpm health:check
```

---

## 9. Health-check adımları

### Otomatik

```bash
pnpm health:check
# Beklenen: API /health → "status":"ok"
```

### Manuel smoke (cutover sonrası)

| # | Test | URL / endpoint | Beklenen |
|---|------|----------------|----------|
| 1 | API health | `GET https://api.azem.cloud/health` | 200, `postgres:true, redis:true, minio:true` |
| 2 | Login | `POST /api/v1/auth/login` | 200/201 |
| 3 | Ürün listesi | `GET /api/v1/products` | 200 |
| 4 | Sepet | `POST /api/v1/cart/items` → `GET /api/v1/cart` | 201 → 200 |
| 5 | Sipariş | `POST /api/v1/orders` | 201 |
| 6 | Admin sipariş | `GET /api/v1/orders` (admin token) | 200 |
| 7 | Kurye | `GET /api/v1/deliveries/my` | 200 |
| 8 | Loyalty | `GET /api/v1/loyalty/me` | 200 |
| 9 | İyzico callback path | `POST /api/v1/payments/callback` erişilebilirlik | 502 değil |
| 10 | Web/Admin/Courier UI | `/login` sayfaları | 200 |
| 11 | MinIO görseller | `https://storage.azem.cloud/...` | 200 |
| 12 | Prisma migration | `prisma migrate status` (API container) | 9 migration applied |
| 13 | BullMQ | API log — `payment-timeout` failed yok | — |

Referans: [`qa-test-scenarios.md`](./qa-test-scenarios.md)

### Dry-run (cutover öncesi, canlıya dokunmadan)

```bash
docker compose --env-file .env.production -f docker/docker-compose.prod.yml config > /dev/null

bash scripts/validate-env.sh .env.production.cutover-draft

curl -s https://api.azem.cloud/health
pnpm health:check

docker compose --env-file .env.production -f docker/docker-compose.prod.yml \
  exec -T api sh -lc 'cd /app/packages/database && npx prisma migrate status'
```

---

## 10. Tahmini downtime riski

| Faktör | Tahmin |
|--------|--------|
| Planlı downtime | **15–30 dk** |
| Kötü senaryo (restore tekrarı) | **45–60 dk** |
| Veri kaybı penceresi | API stop → yeni DB live arası gelen sipariş/ödeme yazılmaz |
| İyzico callback riski | Downtime sırasında callback DB’ye yazılamaz — manuel reconciliation gerekebilir |
| Mobil/web kullanıcıları | API 502/503 — tam erişim kesintisi |
| Redis/BullMQ | Veri korunur; DB kesilince job’lar fail/retry |
| MinIO | Kesinti yok |

**Risk azaltma:** Düşük trafik penceresi; cutover öncesi `PAYMENT_PENDING` sipariş sayısını kontrol et; opsiyonel nginx 503 maintenance sayfası.

---

## 11. Yapılacak dosya değişiklikleri (Faz 7)

| Dosya | Değişiklik | Risk |
|-------|------------|------|
| **YENİ** `docker/docker-compose.supabase.prod.yml` | Supabase self-hosted stack | Yüksek |
| [`docker/docker-compose.prod.yml`](../docker/docker-compose.prod.yml) | `postgres` kaldır/profile; API network + depends_on | Yüksek |
| [`.env.production.example`](../.env.production.example) | Supabase hostname, DIRECT_URL | Düşük |
| [`.env.prod.example`](../.env.prod.example) | Senkron tut | Düşük |
| [`deploy/nginx/pastane-app`](../deploy/nginx/pastane-app) | `studio.azem.cloud` + IP whitelist | Orta |
| [`scripts/backup-prod.sh`](../scripts/backup-prod.sh) | `supabase-db` desteği | Orta |
| [`scripts/restore-prod.sh`](../scripts/restore-prod.sh) | `supabase-db` desteği | Orta |
| [`docs/azem-cloud-vps-deployment.md`](./azem-cloud-vps-deployment.md) | Cutover runbook linki | Düşük |
| [`docs/backup-and-restore.md`](./backup-and-restore.md) | Supabase backup notları | Düşük |
| **VPS only** `.env.production` | DATABASE_URL, DIRECT_URL | Kritik |

### Dokunulmayacak dosyalar

| Alan | Neden |
|------|-------|
| `apps/api/src/auth/**` | JWT auth aynı |
| `apps/web`, `admin`, `courier`, `mobile` | API URL değişmiyor |
| MinIO / Redis compose | Scope dışı |
| Prisma migration SQL | 9 migration local doğrulandı |
| İyzico provider kodu | DB sağlayıcı değişimi şeffaf |

---

## Risk özeti

| Konu | Durum |
|------|--------|
| Prisma `directUrl` prod hazırlığı | `.env.production.example`’da var; VPS `.env.production` güncellenmeli |
| pgBouncer prod | İlk cutover’da kullanma |
| Studio port | 3000 çakışması — `54323` kullan |
| Backup scriptleri | Hâlâ `postgres` servisine bağlı |
| PG 16 → 17 | Staging’de dump testi önerilir |
| Migration sayısı | 9 |
| API/mobile/web | URL sabit; yalnızca downtime kesintisi |
| Ödeme akışı | Kod değişmez; callback timing riski |

---

## Sonraki adım

1. ~~`docker-compose.supabase.prod.yml` draft~~ ✅ (Faz 6.5 uygulandı)
2. ~~Nginx Studio bloğu~~ ✅ [`deploy/nginx/pastane-studio.conf.example`](../deploy/nginx/pastane-studio.conf.example)
3. ~~Staging dry-run~~ ✅ local (2026-05-24) — VPS'te `run-staging-dry-run.sh` tekrarla
4. ~~Faz 7 production cutover~~ ✅ (2026-05-24)
5. ~~Faz 7.2 studio.azem.cloud + legacy close~~ ✅ — [`supabase-production-complete.md`](supabase-production-complete.md)

**Rollback hazırlığı:** Cutover öncesi mutlaka `backup-prod.sh` çalıştır; `postgres_data` volume’u en az 7 gün sakla.
