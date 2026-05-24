# Pastane Platform — Supabase Geçiş Analizi & Uygulama Promptu

## Bağlam ve Kural

Sen kıdemli bir full-stack/DevOps mühendisisin. Aşağıda teknik detayları tam verilen **Pastane Platform** projesinde Supabase geçişini yöneteceksin.

**TEMEL KURAL — İKİ AŞAMALI ÇALIŞMA:**

> **Aşama 1 (bu prompt):** Yalnızca analiz et, planla, riskleri çıkar. Hiçbir dosya değiştirme, hiçbir komut çalıştırma. Çıktın yalnızca analiz raporu ve onay bekleyen adım listesi olacak.
>
> **Aşama 2:** Kullanıcı "Onayla — başla" dediğinde ve hangi adımı onayladığını belirttiğinde o adımı uygula. Her adımı ayrı onayla, toplu uygulama yapma.

---

## Mevcut Proje Yapısı (Referans)

```
Monorepo: pnpm 10 + Turborepo 2
Backend:  apps/api → NestJS 11
ORM:      Prisma (packages/database/schema.prisma)
DB:       PostgreSQL 16 (Docker, port 5432)
Cache:    Redis + BullMQ (port 6379)
Storage:  MinIO (port 9000/9001)
Frontend: apps/web :3000 | apps/admin :3001 | apps/courier :3002
Mobile:   apps/mobile → Expo SDK 56 + React Native
Deploy:   VPS + Docker Compose + Host Nginx + GitHub Actions
Domain:   api.azem.cloud
```

**Auth modeli:** NestJS JWT (httpOnly cookie + BFF). Supabase Auth'a GEÇİLMEYECEK — mevcut sistem korunacak.

**Prisma migration geçmişi (sırayla):**
1. `20260517182508_phase1_backend_core` — temel şema (User, Role, Permission, RefreshToken, OtpCode)
2. `20260517184123_phase2_catalog_stock` — katalog (eski stok tabloları dahil)
3. `20260517221500_phase3_order_payment_flow` — sipariş/ödeme
4. `20260519143000_banners` — Banner CMS
5. `20260520120000_address_map_coordinates` — adres koordinatları
6. `20260520140000_order_delivery_failed` — teslimat başarısız durumu
7. `20260520180000_remove_stock_add_product_publication` — eski stok tabloları kaldırıldı, satış penceresi eklendi
8. `20260523120000_product_units` — satış birimleri

**Prisma model listesi (35 model):**
User, Role, Permission, RolePermission, RefreshToken, OtpCode, Category, ProductUnit, Product, ProductImage, Allergen, ProductAllergen, ProductOptionGroup, ProductOption, Store, DeliveryZone, Cart, CartItem, CartItemOption, Order, OrderItem, OrderItemOption, OrderStatusHistory, Payment, Courier, Delivery, LoyaltyAccount, LoyaltyMovement, LoyaltySetting, Banner, Campaign, Address, Review, Notification, Setting, AuditLog

**Enum'lar (14):**
UserStatus, RoleType, ProductStatus, ProductUnitKind, DeliveryType, OrderStatus, PaymentStatus, CourierStatus, DeliveryStatus, ReviewStatus, LoyaltyMovementType, NotificationType, CampaignStatus, BannerMediaType

**Kritik iş kuralları (veri tabanını etkileyen):**
- Soft delete: çoğu entity'de `deletedAt` alanı var
- Satış penceresi: `saleWindowStart` / `saleWindowEnd` — timezone: `Europe/Istanbul`
- Snapshot pattern: `productNameSnapshot`, `unitPriceSnapshot` sipariş satırlarında
- Ödeme idempotency: `Payment` tablosunda tekrar engeli
- BullMQ: `payment_timeout` job'ı — `PAYMENT_PENDING` siparişleri süre dolunca iptal eder

**Mevcut `docker-compose.dev.yml` servisleri ve portları:**
| Servis   | Port      |
|----------|-----------|
| postgres | 5432      |
| redis    | 6379      |
| minio    | 9000/9001 |
| api      | 3003      |
| web      | 3000      |
| admin    | 3001      |
| courier  | 3002      |

**Mevcut env değişkenleri (DB ile ilgili):**
```
DATABASE_URL=postgresql://...
POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB
REDIS_HOST / REDIS_PASSWORD
MINIO_* (endpoint, keys, buckets, public domain)
```

---

## Geçiş Hedefi

```
NestJS API → Prisma → Supabase PostgreSQL (local, sonra VPS self-hosted)
```

**Bu geçiş şunları KAPSAMAZ (scope dışı):**
- Supabase Auth geçişi — mevcut JWT/cookie auth korunacak
- Supabase Storage geçişi — MinIO mevcut kalacak (ayrı faz)
- Supabase Realtime geçişi — polling ADR kararı bozulmayacak
- RLS (Row Level Security) — tüm güvenlik NestJS layer'da kalacak
- Frontend/mobile rewrite
- API endpoint değişikliği

---

## Genel Kurallar (Tüm Fazlar İçin Geçerli)

- Her fazın sonunda `pnpm check` (lint + typecheck + test + build:ci) yeşil olmalı. Kırmızıysa bir sonraki faza geçme, önce düzelt.
- Supabase CLI local stack versiyonu ile VPS self-hosted versiyonunu eşit tut. Hangi versiyonu kullandığını her adımda logla (`supabase --version`).
- Port çakışması çözümü için `supabase/config.toml`'u düzenle — aşağıdaki alanlar override edilebilir:

```toml
# supabase/config.toml — port override örneği
[db]
port = 54322        # mevcut docker-compose ile çakışma yoksa değiştirme

[studio]
port = 54323

[api]
port = 54321

[inbucket]
port = 54324
```

- `schema.prisma` `directUrl` bloğu için doğru format:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")  // migration için zorunlu, runtime'da kullanılmaz
}
```

- Her dosya değişikliğinden önce mevcut içeriği göster, sonra diff'i göster. Kullanıcı "uygula" demeden commit etme.
- API testleri için mevcut `docs/qa-test-scenarios.md` dosyasını referans al. Her endpoint testi için beklenen HTTP status kodunu belirt. Test aracı: curl veya Postman.

---

## Analiz Edilecek Konular

### 1. Prisma Schema Uyumluluk Analizi

Şu dosyaları incele: `packages/database/schema.prisma`, `packages/database/prisma/migrations/`

**Yanıtlaması gereken sorular:**

- Prisma'da tanımlı 14 enum (`UserStatus`, `RoleType`, `OrderStatus` vb.) Supabase PostgreSQL'de native enum olarak mı oluşturulur, yoksa Prisma bunları farklı mı yönetir? Sorun çıkar mı?
- `deletedAt` soft delete pattern'ı Supabase'de çalışır mı?
- `saleWindowStart` / `saleWindowEnd` alanları `Europe/Istanbul` timezone bilgisiyle saklanıyor. Supabase PostgreSQL'de `timestamptz` vs `timestamp` davranışı nasıl? Veri kayıpsız taşınır mı?
- `Decimal` type kullanan alanlar (fiyat, sadakat puanı) Supabase'de precision kaybı yaşar mı?
- `@db.Text` ve `@db.VarChar` annotation'ları Supabase uyumlu mu?
- Migration 7'de (`remove_stock_add_product_publication`) kaldırılan tablolar migration geçmişinde `DROP TABLE` olarak mı duruyor? Supabase üzerinde `prisma migrate deploy` bu migration'ı hatasız geçer mi?
- Migration geçmişi sıralı ve temiz mi? `_prisma_migrations` shadow DB gerektiriyor mu?
- UUID kullanımı var mı (`@default(uuid())`)? Supabase'in `uuid-ossp` extension'ı gerekiyor mu?
- `autoincrement()` ile `uuid()` karışık kullanım var mı?
- `prisma migrate deploy` — pooled connection üzerinde çalışmaz. `directUrl` ayrımı gerekiyor mu?

### 2. BullMQ + Redis Uyumluluğu

- Supabase PostgreSQL'e geçiş Redis'i etkilemez. Redis aynı kalacak. Ama kontrol et: `payment_timeout` job'ı DB'yi sorguluyor — Supabase bağlantısıyla bu job doğru çalışır mı?
- BullMQ job'larında transaction kullanımı var mı? Supabase connection pool ile uzun transaction riski var mı?

### 3. İyzico Ödeme Entegrasyonu

- İyzico callback endpoint'i (`POST /payments/callback`) veritabanına yazma yapıyor. Supabase bağlantısında bu akış etkilenir mi?
- `PAYMENT_DEV_AUTO_SUCCESS=true` local test senaryolarında Supabase DB'ye yazıyor. Geçiş sonrası bu flag çalışmaya devam edecek mi?
- Ödeme idempotency kontrolü Prisma transaction ile mi yapılıyor? Supabase connection pool transaction'ı nasıl etkiler?

### 4. Local Docker Port Çakışma Analizi

Supabase local stack şu portları kullanır:
| Supabase Servisi | Default Port |
|-----------------|-------------|
| Supabase Studio | 54323        |
| PostgreSQL       | 54322        |
| API Gateway      | 54321        |
| Inbucket (mail) | 54324        |
| pgBouncer        | 54329        |

Mevcut `docker-compose.dev.yml`'deki portlarla çakışma var mı? Tüm portları karşılaştır ve çakışma haritası çıkar.

**Kritik soru:** Supabase local stack mevcut `docker-compose.dev.yml`'e entegre mi edilmeli, yoksa ayrı `docker-compose.supabase.yml` olarak mı çalıştırılmalı? İkisinin trade-off'unu analiz et.

### 5. Connection String Stratejisi

Supabase local kurulumunda iki bağlantı türü var:

```
# Pooled (pgBouncer) — runtime için
DATABASE_URL=postgresql://postgres:password@localhost:54329/postgres?pgbouncer=true

# Direct — migration için
DIRECT_URL=postgresql://postgres:password@localhost:54322/postgres
```

Prisma schema'ya `directUrl` eklenmesi gerekiyor mu? Mevcut `schema.prisma`'daki `datasource db` bloğunu nasıl güncellemeliyiz?

Ayrıca:
- `DIRECT_URL` sadece migration için kullanılacak, runtime'da kullanılmayacak
- `DATABASE_URL` runtime'da pooled bağlantıyı işaret edecek
- Bu değişiklik `packages/database/schema.prisma` dosyasını etkiliyor — değişiklik öncesi tüm downstream bağımlılıkları say

### 6. Supabase Servisleri Kullanım Kararı

Bu projeye özel, aşağıdaki Supabase özelliklerini kullanıp kullanmama kararını gerekçeli ver:

| Özellik | Kullan mı? | Gerekçe |
|---------|-----------|---------|
| Supabase Auth | — | Mevcut JWT/cookie auth var |
| Supabase Storage | — | MinIO entegre, ayrı faz |
| Supabase Realtime | — | ADR: polling kararı var |
| RLS | — | NestJS auth layer yetkili |
| Supabase Edge Functions | — | NestJS API var |
| Supabase Studio | — | DB yönetim arayüzü |

Her satır için net karar ve gerekçe ver.

### 7. Data Migration Stratejisi

Mevcut local PostgreSQL'den Supabase local PostgreSQL'e veri taşıma için iki seçeneği karşılaştır:

**Seçenek A — Schema-only migration + seed:**
```bash
prisma migrate deploy  # schema oluştur
prisma db seed         # demo veri yükle
```

**Seçenek B — pg_dump / pg_restore:**
```bash
pg_dump -h localhost -p 5432 -U postgres -Fc pastane_db > backup.dump
pg_restore -h localhost -p 54322 -U postgres -d postgres backup.dump
```

Hangisi önerilen? Şunu göz önüne al:
- Migration 7'deki DROP TABLE komutları pg_restore'da sorun çıkarır mı?
- Seed verisi (`admin@pastane.com`, `musteri@pastane.com` vb.) Supabase üzerinde çalışır mı?
- bcrypt hashlenmiş şifreler taşınır mı?
- MinIO dosyaları (ürün görselleri, banner medyası) bu taşımayı etkiler mi? (MinIO aynı kalacak, Supabase Storage'a taşınmıyor)

### 8. VPS Self-Hosted Supabase Kaynak Analizi

Mevcut VPS'te çalışan servisler:
- NestJS API
- Next.js web/admin/courier (3 container)
- PostgreSQL 16
- Redis
- MinIO

Supabase self-hosted stack ek olarak şunları getirir:
- `supabase/postgres` (mevcut PG'nin yerini alır)
- `supabase/studio`
- `supabase/kong` (API gateway)
- `supabase/auth` (GoTrue — kullanılmasa da ayakta)
- `supabase/realtime` (kullanılmasa da ayakta)
- `supabase/storage` (kullanılmasa da ayakta)
- `supabase/imgproxy`
- `supabase/inbucket`
- `supabase/meta`
- `supabase/vector`

**Sorular:**
- Kaç container eklenecek? Toplam kaynak tahmini nedir (RAM, CPU)?
- Supabase self-hosted'da kullanılmayan servisler (`auth`, `realtime`, `storage`, `edge-functions`) devre dışı bırakılabilir mi? Nasıl?
- Mevcut `deploy/nginx/pastane-app` Nginx config'ine Supabase Studio için ayrı bir `location` veya `server` bloğu eklenmeli mi?
- Supabase Studio'ya erişim nasıl kısıtlanmalı? (VPN/IP whitelist önerisi)
- Mevcut `docker-compose.prod.yml` ile Supabase compose nasıl ayrıştırılmalı?

---

## Beklenen Analiz Raporu Formatı

Yanıtını aşağıdaki bölümlerle ver. Her bölüm için net "sorun var / sorun yok / belirsiz" işareti koy.

```
## RAPOR: Pastane Platform → Supabase Geçiş Analizi

### 0. Özet Tablo
Her risk alanı için: 🟢 Sorunsuz / 🟡 Dikkat / 🔴 Engel

### 1. Prisma Schema Uyumluluk
- Enum'lar: [durum]
- Timezone alanları: [durum]
- Decimal alanlar: [durum]
- Migration geçmişi temizliği: [durum]
- UUID / extension gereksinimleri: [durum]
- directUrl gerekliliği: [durum + schema.prisma değişikliği taslağı]

### 2. BullMQ / Ödeme Akışı Etkileri
- payment_timeout job'ı: [durum]
- İyzico callback: [durum]
- Transaction güvenliği: [durum]

### 3. Port Çakışma Haritası
- [mevcut port] ↔ [Supabase port]: [çakışma var/yok]

### 4. Connection String Stratejisi
- Önerilen DATABASE_URL (local): [değer taslağı]
- Önerilen DIRECT_URL (local): [değer taslağı]
- schema.prisma değişikliği: [taslak blok]

### 5. Supabase Özellik Kullanım Kararları
| Özellik | Karar | Gerekçe |

### 6. Data Migration Önerisi
- Önerilen yöntem: A veya B
- Gerekçe ve riskler
- Komut sırası (onay sonrası uygulanacak)

### 7. VPS Kaynak ve Mimari Etki
- Eklenecek container sayısı: X
- Tahmini RAM artışı: X MB
- Devre dışı bırakılabilecek Supabase servisleri: [liste]
- Nginx değişikliği gerekiyor mu: [evet/hayır + gerekçe]

### 8. Değişmesi Gereken Dosyalar
| Dosya | Değişiklik Türü | Risk |

### 9. Değişmemesi Gereken Dosyalar
| Dosya | Neden dokunulmamalı |

### 10. Uygulama Fazları (Onay Bekleyen Sıra)
Faz 1: ...
Faz 2: ...
...

### 11. Rollback Noktaları
Her faz için rollback komutu

### 12. Tahmini Süre
| Faz | Tahmini Süre |
```

---

## Geçiş Fazları (Analiz Sonrası Uygulanacak — Her Biri Ayrı Onay Gerektirir)

Analiz raporunu onayladıktan sonra aşağıdaki fazları sırayla uygulayacaksın. **Şimdi uygulamıyorsun, sadece planlıyorsun.**

### Faz 1 — Local Supabase Kurulum
- `supabase/cli` kurulumu (homebrew veya npm). Kurulumdan sonra `supabase --version` ile versiyonu logla.
- `supabase init` yerleşim kararı: monorepo kökünde mi (`supabase/`) yoksa `docker/supabase/` altında mı? Mevcut `docker/` yapısıyla tutarlı olacak şekilde öner.
- `supabase start` ile local stack başlatma
- Port çakışması varsa `supabase/config.toml`'da ilgili alanı override et (bkz. Genel Kurallar bölümü)
- Mevcut `postgres` container'ı durdurma planı: `docker compose -f docker/docker-compose.dev.yml stop postgres`

**Rollback:** `supabase stop && docker compose -f docker/docker-compose.dev.yml up -d postgres` — eski PostgreSQL container'ı ayağa kaldır, `DATABASE_URL`'yi eski değere döndür, `pnpm prisma:generate` çalıştır.

### Faz 2 — Prisma Schema Güncelleme
- `schema.prisma`'ya `directUrl` eklenmesi (gerekiyorsa — bkz. Genel Kurallar bölümündeki taslak)
- `.env` ve `.env.example`'a `DIRECT_URL` eklenmesi
- `SUPABASE_URL` ve `SUPABASE_ANON_KEY` — yalnızca gerçekten kullanılacaksa ekle; şu an backend için gerekli değil, ekleme
- `prisma generate` çalıştırma
- `pnpm check` yeşil olmalı

**Rollback:** `schema.prisma`'dan `directUrl` satırını kaldır, `.env`'den `DIRECT_URL`'yi kaldır, `pnpm prisma:generate` çalıştır.

### Faz 3 — Migration Deploy
```bash
pnpm --filter @pastane/database prisma:migrate:deploy
```
- 8 migration sırayla Supabase local DB'ye uygulanacak
- Her migration sonrası tablo sayısını kontrol et (Supabase Studio veya `psql`)
- `_prisma_migrations` tablosunun 8 satır içerdiğini doğrula
- `pnpm check` yeşil olmalı

**Rollback:** `supabase db reset` ile Supabase local DB'yi temizle. Eski postgres container'a dönmek için Faz 1 rollback'i uygula.

### Faz 4 — Seed
```bash
pnpm --filter @pastane/database prisma:seed
```
- Demo kullanıcılar oluşturulacak: `admin@pastane.com`, `operator@pastane.com`, `product@pastane.com`, `kurye1@pastane.com`, `kurye2@pastane.com`, `musteri@pastane.com`
- Rollerin ve izinlerin doğru atandığını `SELECT * FROM "Role"` ile doğrula
- bcrypt hashlenmiş şifrelerin okunabilir (ama decode edilemez) formatta saklandığını doğrula

**Rollback:** `supabase db reset` → Faz 3'ü tekrar çalıştır (seed olmadan).

### Faz 5 — API Bağlantı Testi
```bash
pnpm --filter @pastane/api dev
```
Test aracı: curl veya Postman. Referans: `docs/qa-test-scenarios.md`. Her endpoint için beklenen HTTP status kodunu kontrol et:

| Endpoint | Method | Beklenen Status |
|----------|--------|----------------|
| `/health` | GET | 200 |
| `/auth/login` (seed admin) | POST | 200 |
| `/products` | GET | 200 |
| `/cart` | POST → GET | 201 → 200 |
| `/orders` (`PAYMENT_DEV_AUTO_SUCCESS=true`) | POST | 201 |
| `/orders` (admin token) | GET | 200 |
| `/deliveries/my` (kurye token) | GET | 200 |
| `/loyalty/me` (müşteri token) | GET | 200 |

Ek kontrol: BullMQ `payment_timeout` job'ının Supabase DB üzerinde çalıştığını doğrula — API loglarında job'ın tetiklendiğini gör.

**Rollback:** `DATABASE_URL`'yi eski postgres container'a döndür, API'yi yeniden başlat.

### Faz 6 — Frontend Build Testi
```bash
pnpm --filter @pastane/web build
pnpm --filter @pastane/admin build
pnpm --filter @pastane/courier build
pnpm check
```
Her build hatasız tamamlanmalı. `pnpm check` yeşil olmalı. Bu noktada local geçiş tamamlanmış kabul edilir.

**Rollback:** Bu fazda DB değişikliği yok. Build başarısız olursa Faz 5 rollback'ini uygula, sorunu düzelt, tekrar dene.

### Faz 7 — VPS Self-Hosted Supabase Kurulum (Local Tamamlandıktan Sonra)

**Ön koşul:** Faz 1–6 local'de sorunsuz tamamlanmış olmalı.

**Maintenance window tahmini: 10–20 dakika.** Bu süre içinde ödeme sistemi, sipariş sistemi, admin/kurye panel ve mobil API erişilemez olacak. Müşteri bildirimi gerekip gerekmediğini değerlendir.

**Adımlar (sırasıyla):**
1. Mevcut VPS postgres volume'unun tam yedeğini al:
   ```bash
   docker exec pastane-postgres pg_dump -U postgres pastane_db > backup-pre-supabase-$(date +%Y%m%d-%H%M%S).sql
   ```
2. Supabase self-hosted compose dosyasını VPS'e taşı
3. Kullanılmayan Supabase servislerini devre dışı bırak (`auth`, `realtime`, `storage`, `edge-functions`, `imgproxy`, `inbucket`, `vector`) — sadece `postgres`, `studio`, `kong`, `meta` çalışsın
4. Port çakışmalarını VPS ortamında da çöz
5. `deploy/nginx/pastane-app` Nginx config'ine Supabase Studio için `server` bloğu ekle — sadece admin IP'ye açık
6. SSL sertifikası (Let's Encrypt veya mevcut wildcard) Studio subdomain'ine bağla
7. `prisma migrate deploy` çalıştır
8. Seed'i çalıştır (ya da production data için pg_restore)
9. `GET https://api.azem.cloud/health` — 200 dönmeli
10. Smoke test: login, ürün listesi, sepet, ödeme (dev flag ile)
11. `pnpm check` yeşil

**Rollback:**
```bash
# Supabase'i durdur
docker compose -f docker-compose.supabase.yml down

# Eski postgres volume'u geri yükle
docker compose -f docker/docker-compose.prod.yml up -d postgres
docker exec pastane-postgres psql -U postgres -c "DROP DATABASE pastane_db;"
docker exec pastane-postgres psql -U postgres -c "CREATE DATABASE pastane_db;"
cat backup-pre-supabase-*.sql | docker exec -i pastane-postgres psql -U postgres pastane_db

# Env'i eski DATABASE_URL'ye döndür
# App'leri yeniden başlat
docker compose -f docker/docker-compose.prod.yml up -d
```

---

## Güvenlik Kuralları (Tüm Fazlar İçin Geçerli)

- `service_role` key frontend'e, mobile'a, repoya gitmeyecek
- Supabase Studio public internete açık olmayacak — yalnızca VPN/IP whitelist
- DB portu (5432 veya 54322) VPS'te public açılmayacak
- RLS aktif edilmeyecek — NestJS auth layer tek güvenlik katmanı
- `SUPABASE_ANON_KEY` yalnızca gelecekte Supabase özelliği doğrudan kullanılırsa frontend'e verilecek; şu an gereksiz
- Production secret'lar repoya commit edilmeyecek

---

## Başlamadan Önce Oku

Bu prompt'u çalıştırmadan önce şu dosyaları oku:
1. `packages/database/schema.prisma`
2. `packages/database/prisma/migrations/` (tüm migration dosyaları)
3. `docker/docker-compose.dev.yml`
4. `docker/docker-compose.prod.yml`
5. `.env.example`
6. `.env.production.example`
7. `deploy/nginx/pastane-app`
8. `scripts/push-vps.sh`

Bu dosyaları okumadan analiz yapma. "Dosyaya erişemiyorum" durumunda kullanıcıdan içeriklerini yapıştırmasını iste.
