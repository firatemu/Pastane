# Faz 6.8 — Staging Supabase Dry-Run Planı

**Durum:** Staging altyapısı repo'da hazır — VPS'te dry-run henüz çalıştırılmadı  
**Ön koşul:** Faz 6.5 tamamlandı, local Supabase geçişi (Faz 1–6) yeşil  
**İlgili:** [`supabase-vps-cutover-plan-faz-6.5.md`](./supabase-vps-cutover-plan-faz-6.5.md)

---

## Amaç

Canlı production PostgreSQL'i **değiştirmeden**, aynı VPS üzerinde izole staging ortamında:

1. Production dump → sanitize → restore  
2. Staging API + frontend stack  
3. Tam smoke test  
4. Cutover süre ölçümü  
5. Rollback simülasyonu  
6. Kaynak analizi  

**Kısıtlar (kesin):**

- Production compose değiştirilmez (`docker-compose.prod.yml` dokunulmaz)
- Production container'ları durdurulmaz
- Canlı domain'ler / nginx prod vhost'ları değiştirilmez
- Staging yalnızca **loopback** portlarında (`127.0.0.1:31xx`)

---

## Staging mimarisi

```
Production (pastane-prod) — DOKUNULMAZ
  postgres :5432 internal | api :3003 | web :3000 | ...

Staging Supabase (supabase-staging)
  pastane_supabase_db_staging  → 127.0.0.1:55432 (host tools)
  pastane_supabase_studio_staging → 127.0.0.1:55323 (--profile studio, opsiyonel)
  Network: pastane_staging_supabase
  Volume:  supabase_staging_db_data

Staging App (pastane-staging)
  api     → 127.0.0.1:3103
  web     → 127.0.0.1:3100
  admin   → 127.0.0.1:3101
  courier → 127.0.0.1:3102
  minio   → 127.0.0.1:9100 / 9101
  redis   → internal only
  Networks: pastane_staging_internal, pastane_staging_edge + external supabase network
  Volumes: pastane_staging_redis_data, pastane_staging_minio_data, pastane_staging_uploads_data
```

### Port çakışma tablosu (prod vs staging)

| Port | Production | Staging | Çakışma |
|------|------------|---------|---------|
| 3000 | web prod | — | Yok |
| 3001 | admin | — | Yok |
| 3002 | courier | — | Yok |
| 3003 | api | — | Yok |
| 3100–3103 | — | web/admin/courier/api | Yok |
| 5432 | postgres internal | — | Yok |
| 55432 | — | supabase-db host bind | Yok |
| 55323 | — | pgAdmin studio profile | Yok |
| 6379 | redis internal | staging redis internal | Yok |
| 9000 | minio prod | — | Yok |
| 9100/9101 | — | minio staging | Yok |
| 80/443 | nginx prod | — | Yok |

---

## Repo dosyaları (hazır)

| Dosya | Açıklama |
|-------|----------|
| [`docker/docker-compose.supabase.staging.yml`](../docker/docker-compose.supabase.staging.yml) | Staging DB (PG 16, izole volume/network) |
| [`docker/docker-compose.staging.yml`](../docker/docker-compose.staging.yml) | Staging app stack (api/web/admin/courier/redis/minio) |
| [`.env.staging.example`](../.env.staging.example) | Staging env şablonu |
| [`scripts/staging/run-staging-dry-run.sh`](../scripts/staging/run-staging-dry-run.sh) | Tam orchestrator |
| [`scripts/staging/copy-prod-dump-for-staging.sh`](../scripts/staging/copy-prod-dump-for-staging.sh) | Read-only prod dump |
| [`scripts/staging/restore-to-staging.sh`](../scripts/staging/restore-to-staging.sh) | pg_restore + sanitize |
| [`scripts/staging/sanitize-staging-db.sql`](../scripts/staging/sanitize-staging-db.sql) | PII/secret maskeleme |
| [`scripts/staging/set-staging-passwords.sh`](../scripts/staging/set-staging-passwords.sh) | Tek staging şifresi |
| [`scripts/staging/smoke-staging.sh`](../scripts/staging/smoke-staging.sh) | API smoke testleri |
| [`scripts/staging/measure-cutover-timing.sh`](../scripts/staging/measure-cutover-timing.sh) | Süre ölçümü → JSON |
| [`scripts/staging/rollback-dry-run.sh`](../scripts/staging/rollback-dry-run.sh) | Staging down + prod health |
| [`scripts/staging/resource-snapshot.sh`](../scripts/staging/resource-snapshot.sh) | RAM/disk/CPU |

---

## VPS'te kurulum (tek seferlik)

```bash
cd /var/www/pastane-app/app
git pull origin main

cp .env.staging.example .env.staging
chmod 600 .env.staging
# Zorunlu: STAGING_POSTGRES_PASSWORD, POSTGRES_PASSWORD, REDIS_PASSWORD, JWT_*, MINIO_SECRET_KEY
# (change_me içeren satırları değiştir; pgAdmin opsiyonel)
# Local WSL: BACKUP_DIR=tmp/pastane-staging

mkdir -p /var/backups/pastane-staging   # VPS
# mkdir -p tmp/pastane-staging          # local WSL
```

---

## Dry-run çalıştırma sonuçları (2026-05-24 — local WSL)

**Ortam:** Dev postgres dump → staging supabase-db → staging app stack. Production/VPS compose **dokunulmadı**.

| Adım | Sonuç |
|------|--------|
| pg_dump (dev, prod simülasyonu) | OK — 145 KB dump |
| pg_restore + sanitize | OK — **1 s** |
| Staging stack health | OK — `:3103/health` postgres+redis+minio true |
| Smoke (login, cart, order, loyalty, courier, admin, callback) | **Tümü geçti** |
| migrate deploy | 9 migration, pending yok |
| Rollback dry-run | Staging down; dev API `:3003` **200** |
| Staging RAM (idle) | ~393 MiB toplam |

**Cutover süre tahmini (build hariç):** ~26 s local (VPS prod dump ile **15–25 dk** beklenir).

**Güven skoru güncellemesi:** 7.5 → **8.5 / 10** (staging dry-run yeşil).

Detay: [`tmp/pastane-staging/cutover-timing-report.json`](../tmp/pastane-staging/cutover-timing-report.json) (gitignore'da).

---

## Dry-run çalıştırma

### Tam akış (önerilen)

```bash
bash scripts/staging/run-staging-dry-run.sh
```

### Adım adım

```bash
# 1) Read-only production dump
bash scripts/staging/copy-prod-dump-for-staging.sh

# 2) Staging DB + restore + sanitize
bash scripts/staging/restore-to-staging.sh

# 3) Staging app stack
pnpm staging:supabase:up
pnpm staging:app:up
# veya: docker compose ... build && up -d

# 4) Smoke
pnpm staging:smoke

# 5) Timing + resource
bash scripts/staging/measure-cutover-timing.sh
bash scripts/staging/resource-snapshot.sh

# 6) Rollback simülasyonu
bash scripts/staging/rollback-dry-run.sh
```

### SSH tunnel ile UI test (opsiyonel)

```bash
ssh -L 3100:127.0.0.1:3100 -L 3103:127.0.0.1:3103 deploy@76.13.14.43
# Tarayıcı: http://127.0.0.1:3100
```

---

## Sanitize politikası

Restore sonrası [`sanitize-staging-db.sql`](../scripts/staging/sanitize-staging-db.sql):

| Veri | İşlem |
|------|--------|
| `refresh_tokens`, `otp_codes` | TRUNCATE |
| `users.email` | `staging+{id}@example.test` |
| `users.phone` | Rol başına deterministik (`905559000001` admin, `905559000010` customer, …) |
| `users.passwordHash` | `set-staging-passwords.sh` → `StagingTest123!` |
| `payments` | provider token/idempotency temizlenir |
| `notifications.metadata`, `audit_logs` | NULL |

**Smoke login (sanitize sonrası):**

| Rol | Telefon | Şifre |
|-----|---------|-------|
| Admin | 905559000001 | StagingTest123! |
| Customer | 905559000010 | StagingTest123! |
| Courier | 905559000004 | StagingTest123! |

---

## Staging test matrisi

| # | Test | Endpoint / kontrol | Beklenen |
|---|------|-------------------|----------|
| 1 | DB restore | `pg_restore` hatasız | OK |
| 2 | Sanitize | SQL + password script | OK |
| 3 | migrate deploy/status | `prisma migrate status` | 9 applied |
| 4 | Health | `GET :3103/health` | 200, postgres+redis+minio true |
| 5 | Login | `POST /api/v1/auth/login` | token |
| 6 | Register | `POST /api/v1/auth/register` | opsiyonel |
| 7 | Products | `GET /api/v1/products` | 200 |
| 8 | Cart | POST item → GET cart | 201 → 200 |
| 9 | Checkout / order | `POST /api/v1/orders` | 201 |
| 10 | Loyalty | `GET /api/v1/loyalty/me` | 200 |
| 11 | Courier | `GET /api/v1/deliveries/my` | 200 |
| 12 | Admin orders | `GET /api/v1/orders` | 200 |
| 13 | İyzico callback route | `POST /api/v1/payments/callback` | ≠ 502 |
| 14 | Redis jobs | API log, `payment-timeout` | failed yok |
| 15 | MinIO | health + bucket list (staging volume) | OK |

Otomatik: `bash scripts/staging/smoke-staging.sh`

---

## Süre ölçümü (şablon)

Dry-run sonrası [`cutover-timing-report.json`](/var/backups/pastane-staging/cutover-timing-report.json) doldurulur:

```json
{
  "measuredAt": "YYYY-MM-DDTHH:MM:SSZ",
  "seconds": {
    "supabaseDbStartup": 0,
    "pgRestoreAndSanitize": 0,
    "prismaMigrateDeploy": 0,
    "stagingAppStartup": 0,
    "totalEstimate": 0
  }
}
```

| Metrik | Dry-run (doldur) | Prod tahmin (Faz 6.5) |
|--------|------------------|------------------------|
| pg_restore | ___ s | 2–10 dk (DB boyutuna bağlı) |
| sanitize + passwords | ___ s | 30–60 s |
| migrate deploy | ___ s | 15–60 s (idempotent) |
| api + frontends up | ___ s | 2–5 dk (build hariç) |
| smoke test | ___ s | 3–5 dk |
| **Toplam cutover** | ___ s | **15–30 dk** |

---

## Rollback dry-run

[`rollback-dry-run.sh`](../scripts/staging/rollback-dry-run.sh):

1. `pastane-staging` stack down  
2. `supabase-staging` stack down (volume korunur)  
3. Production `docker ps` doğrula  
4. `https://api.azem.cloud/health` → 200  

**Prod rollback simülasyonu:** `.env.production` ve `postgres_data` volume'a dokunulmaz — gerçek cutover rollback'i Faz 6.5 Bölüm 8'e bakın.

---

## Kaynak analizi

[`resource-snapshot.sh`](../scripts/staging/resource-snapshot.sh) çıktısı:

- `free -m` — host RAM  
- `df -h` — disk  
- `docker stats` — prod + staging container CPU/RAM  
- `docker volume ls` — volume boyutları  

**Dry-run sırasında izlenecekler:**

| Metrik | Not |
|--------|-----|
| Staging ek RAM | ~512 MB–1.5 GB (PG 16 + redis + minio + api) |
| Prod etkilenmemeli | `docker stats pastane_api_prod` stabil kalmalı |
| Disk | Staging dump + restore ≈ 2× DB boyutu geçici |

---

## Bölüm 9 — Production değerlendirme raporu

> **Not:** Aşağıdaki skorlar Faz 6.5 analizi + local Faz 1–6 deneyimine dayalı **ön tahmindir**. VPS dry-run çalıştırıldıktan sonra `cutover-timing-report.json` ve `resource-snapshot.txt` ile güncellenmelidir.

### Güven skoru (production cutover için)

| Alan | Skor (0–10) | Gerekçe |
|------|-------------|---------|
| Şema / migration uyumu | **9** | 9 migration local Supabase'de sorunsuz |
| Veri taşıma (pg_restore) | **7** | Staging dry-run ölçümü gerekli; PG 16→16 hizalı |
| Uygulama bağlantısı | **8** | directUrl + direct PG local'de doğrulandı |
| pgBouncer / pooler | **4** | Local'de Prisma uyumsuz — prod'da ilk cutover pooler'sız |
| Rollback | **8** | `postgres_data` volume + dump script mevcut |
| Operasyonel hazırlık | **6** | backup-prod hâlâ `postgres` servis adına bağlı |
| **Genel güven** | **7.5 / 10** | Staging dry-run yeşil olursa → **8.5** |

### Tahmini production downtime

| Senaryo | Süre |
|---------|------|
| Optimistik | 15 dk |
| Beklenen | 20–25 dk |
| Kötü (restore retry) | 45–60 dk |

### Kritik riskler

| Risk | Seviye | Azaltma |
|------|--------|---------|
| pg_restore süresi DB büyüklüğüyle artar | Yüksek | Staging'de ölç; dump sırasında API stop |
| İyzico callback downtime penceresinde | Orta | Düşük trafik; reconciliation prosedürü |
| Sanitize edilmemiş dump staging'de kalır | Yüksek | `sanitize-staging-db.sql` zorunlu adım |
| Staging/port prod'a sızması | Düşük | Loopback bind + ayrı project name |
| PG 16 vs Supabase image 17 | Orta | Staging PG 16; prod supabase-db PG 16 kullan |
| pgBouncer prod'da Prisma kırılması | Yüksek | İlk cutover direct `:5432` |

### Önerilen maintenance window

| Parametre | Öneri |
|-----------|--------|
| Gün | Hafta içi, Salı–Perşembe |
| Saat | 02:00–04:00 Europe/Istanbul |
| Süre rezervi | 60 dk (20 dk iş + 40 dk buffer) |
| Duyuru | 24 saat önce; aktif `PAYMENT_PENDING` sipariş kontrolü |

### Önerilen rollback süresi

| Adım | Süre |
|------|------|
| Staging/supabase prod stack durdur | 1–2 dk |
| `.env.production` eski DATABASE_URL | 1 dk |
| `postgres` container + volume up | 2–3 dk |
| `restore-prod.sh` (dump varsa) | 5–15 dk |
| API health + smoke | 3–5 dk |
| **Toplam rollback** | **12–25 dk** |

### Eksik kalan production hazırlıkları (Faz 7 öncesi)

- [ ] VPS'te `run-staging-dry-run.sh` yeşil çalıştır  
- [ ] `docker-compose.supabase.prod.yml` (staging'den türet, prod isimleri)  
- [ ] `docker-compose.prod.yml` — postgres → external supabase network (Faz 7)  
- [ ] `scripts/backup-prod.sh` / `restore-prod.sh` — supabase-db desteği  
- [x] Nginx `studio.azem.cloud` — Faz 7.2 [`deploy/nginx/pastane-studio.conf`](../deploy/nginx/pastane-studio.conf)
- [ ] VPS `.env.production` — `DATABASE_URL` / `DIRECT_URL` güncelleme  
- [ ] Maintenance duyuru + İyzico callback runbook  
- [ ] Dry-run timing raporu ile downtime revize  

---

## Temizlik (staging stack kaldırma)

```bash
pnpm staging:app:down
pnpm staging:supabase:down

# Volume silmek (staging verisi tamamen gitsin):
docker compose --project-name supabase-staging --env-file .env.staging \
  -f docker/docker-compose.supabase.staging.yml down -v
docker volume rm pastane_staging_redis_data pastane_staging_minio_data pastane_staging_uploads_data 2>/dev/null || true
```

Production'a dokunulmaz.

---

## Sonraki adım

1. VPS'te `bash scripts/staging/run-staging-dry-run.sh`  
2. Raporları (`cutover-timing-report.json`, `resource-snapshot.txt`) arşivle  
3. Bu dokümandaki Bölüm 9 skorlarını ölçülen değerlerle güncelle  
4. Onay → Faz 7 production cutover
