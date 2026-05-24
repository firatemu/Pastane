# Faz 6.9 — Final Production Build Validation

**Durum:** Cutover tamamlandı (2026-05-24)  
**Cutover image tag:** `v1.1.0-supabase-cutover` (canlı)  
**DB backend:** `pastane_supabase_db_prod` (supabase-db)

---

## Özet

| Kontrol | Sonuç |
|---------|--------|
| `pnpm install --frozen-lockfile` | OK |
| `pnpm verify:docker-lockfile` | OK (local) |
| Docker build (local, 4 image) | OK — hata yok |
| Docker build (VPS, 4 image) | OK — **285 s** |
| `pnpm check` | OK — 10/10 |
| Prisma migrate status (staging API container) | OK — 9 migration |
| Staging smoke (yeni build) | OK — **cart dahil tümü** |
| Prod health (before/after VPS validation) | **200** |

**Production-ready:** **Evet** — Faz 7 cutover için image tag `v1.1.0-supabase-cutover` kullanılabilir.

---

## Final image tag listesi (cutover günü)

| Servis | Image |
|--------|--------|
| API | `pastane/pastane-api:v1.1.0-supabase-cutover` |
| Web | `pastane/pastane-web:v1.1.0-supabase-cutover` |
| Admin | `pastane/pastane-admin:v1.1.0-supabase-cutover` |
| Courier | `pastane/pastane-courier:v1.1.0-supabase-cutover` |

VPS `.env.production` cutover anında (Faz 7):

```bash
REGISTRY=pastane
IMAGE_TAG=v1.1.0-supabase-cutover
```

---

## Build süreleri

| Ortam | Servis | Süre |
|-------|--------|------|
| Local WSL | api | 3m 10s |
| Local WSL | web | 3m 44s |
| Local WSL | admin | 3m 31s |
| Local WSL | courier | 3m 32s |
| **VPS** | **4 image (compose build)** | **285 s (~4m 45s)** |

---

## Lockfile kalıcı çözüm

1. `apps/admin`, `apps/web`, `apps/courier` → `@pastane/ui` workspace dependency eklendi (Dockerfile ile uyumlu).
2. [`scripts/verify-docker-lockfile.sh`](../scripts/verify-docker-lockfile.sh) — root + her prod Dockerfile filter için `--frozen-lockfile` doğrular.
3. `pnpm verify:docker-lockfile` — CI / pre-cutover adımı.
4. VPS host’ta pnpm yoksa script skip eder; **Docker build authoritative**.

---

## Cutover günü — kesin komut listesi (Faz 7)

> Maintenance window. Prod trafiği duracak. Sıra önemli.

```bash
cd /var/www/pastane-app/app
git fetch origin main && git reset --hard origin/main   # cutover commit/tag

# 1) Pre-cutover backup (postgres — mevcut prod)
bash scripts/backup-prod.sh

# 2) Supabase prod DB stack (henüz API bağlanmıyor)
docker compose --project-name supabase-prod --env-file .env.production \
  -f docker/docker-compose.supabase.prod.yml up -d supabase-db

# 3) API durdur (yazma trafiği kes)
docker compose --project-name pastane-prod --env-file .env.production \
  -f docker/docker-compose.prod.yml stop api

# 4) Prod dump → supabase-db restore (staging script mantığı, prod hedef)
#    DUMP: backup-prod çıktısı veya copy-prod-dump-for-staging benzeri prod→supabase restore runbook
bash scripts/restore-prod.sh   # DB_SERVICE=supabase-db ile (Faz 6.5)

# 5) .env.production — DATABASE_URL / DIRECT_URL supabase-db (cutover overlay)
#    cp .env.production.cutover.example değerlerini uygula (manuel, onaylı)

# 6) Cutover compose overlay + yeni image tag
export IMAGE_TAG=v1.1.0-supabase-cutover
docker compose --project-name pastane-prod --env-file .env.production \
  -f docker/docker-compose.prod.yml \
  -f docker/docker-compose.prod.cutover.yml build

docker compose --project-name pastane-prod --env-file .env.production \
  -f docker/docker-compose.prod.yml \
  -f docker/docker-compose.prod.cutover.yml up -d

# 7) Migrate + smoke
docker compose --project-name pastane-prod --env-file .env.production \
  -f docker/docker-compose.prod.yml \
  -f docker/docker-compose.prod.cutover.yml exec -T api \
  sh -lc 'cd /app/packages/database && npx prisma migrate deploy --schema=schema.prisma'

curl -sf https://api.azem.cloud/health
bash scripts/staging/smoke-staging.sh   # STAGING_API_URL prod loopback veya public URL ile uyarla

# 8) Nginx studio (opsiyonel, ayrı runbook)
# deploy/nginx/pastane-studio.conf.example
```

---

## Rollback komut listesi

```bash
cd /var/www/pastane-app/app

# 1) Cutover stack durdur
docker compose --project-name pastane-prod --env-file .env.production \
  -f docker/docker-compose.prod.yml \
  -f docker/docker-compose.prod.cutover.yml down

docker compose --project-name supabase-prod --env-file .env.production \
  -f docker/docker-compose.supabase.prod.yml down

# 2) .env.production — eski DATABASE_URL (postgres servisi) geri yükle
#    (cutover öncesi yedeklenmiş .env.production.bak)

# 3) Legacy postgres up
docker compose --project-name pastane-prod --env-file .env.production \
  -f docker/docker-compose.prod.yml up -d postgres

# 4) Restore (cutover öncesi backup)
bash scripts/restore-prod.sh   # DB_SERVICE=postgres

# 5) Eski image tag ile app up
export IMAGE_TAG=v1.0.0   # cutover öncesi tag
docker compose --project-name pastane-prod --env-file .env.production \
  -f docker/docker-compose.prod.yml up -d

curl -sf https://api.azem.cloud/health
```

**Rollback süresi (VPS dry-run tahmini):** 12–25 dk (DB küçük: ~5–10 dk).

---

## Maintenance window checklist

### T-24 saat
- [ ] Bakım duyurusu (web / sosyal / admin)
- [ ] Aktif `PAYMENT_PENDING` sipariş kontrolü
- [ ] `IMAGE_TAG=v1.1.0-supabase-cutover` image’ları VPS’te mevcut
- [ ] `.env.production.cutover` değerleri hazır (secret’lar doldurulmuş, **henüz uygulanmamış**)
- [ ] Rollback: cutover öncesi `backup-prod.sh` + `.env.production.bak`

### T-1 saat
- [ ] `curl https://api.azem.cloud/health` → 200
- [ ] `df -h` — disk > 2 GB boş
- [ ] Ekip / İyzico callback runbook hazır

### Cutover (T+0)
- [ ] Maintenance mode / nginx 503 (opsiyonel)
- [ ] `backup-prod.sh`
- [ ] API stop → restore → env swap → cutover compose up
- [ ] migrate deploy
- [ ] Health + smoke
- [ ] İyzico test callback / reconciliation

### T+30 dk
- [ ] Prod smoke yeşil → maintenance kaldır
- [ ] 1 saat izleme (API log, payment, order)

### Rollback tetikleyicileri
- Health != 200 (5 dk+)
- Smoke FAIL
- Kritik payment/order hatası
- Restore/migrate hata

---

## Faz 6.9 doğrulama komutları (tekrarlanabilir)

```bash
# Local / CI
pnpm verify:docker-lockfile
pnpm check

# Local image build
export IMAGE_TAG=v1.1.0-supabase-cutover VERSION=v1.1.0-supabase-cutover
docker build -f docker/Dockerfile.api.prod --build-arg VERSION=$VERSION \
  -t pastane/pastane-api:$IMAGE_TAG .

# VPS staging smoke (prod’a dokunmaz)
cd /var/www/pastane-app/app
sed -i 's|^IMAGE_TAG=.*|IMAGE_TAG=v1.1.0-supabase-cutover|' .env.staging
docker compose --project-name pastane-staging --env-file .env.staging \
  -f docker/docker-compose.staging.yml build
bash scripts/staging/run-staging-dry-run.sh --skip-dump --skip-build
```

---

## Bilinen notlar

- Prod DB şu an **~92 KB** dump — cutover downtime kısa; büyüme olursa restore süresini yeniden ölç.
- Staging smoke cart fix: paginated API `{ data: [...], meta }` envelope — [`smoke-staging.sh`](../scripts/staging/smoke-staging.sh).
- Cutover’da **pooler/pgBouncer kullanma** — direct `DATABASE_URL` / `DIRECT_URL` (Faz 6.5 planı).
