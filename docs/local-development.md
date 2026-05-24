# Yerel geliştirme

## Gereksinimler

- **Node.js 22** (repo `engines` alanına uyun; Node 20 ile çoğu işlem çalışsa da resmi hedef 22’dir).
- **pnpm** (Corepack: `corepack enable`).
- PostgreSQL, Redis, MinIO: tam yığın için `docker/docker-compose.dev.yml` kullanın.

## Kurulum

Kökteki **`.npmrc`** `shamefully-hoist=true` kullanır; böylece pnpm klasik “düz `node_modules`” düzenine yaklaşır ve Next.js’in dahili dosyaları (`dist/shared/lib/segment.js`) **eksik kopyalanmış symlink’li kurulumlar** yüzünden (**`Cannot find module '../../segment'`** derleme çalışma anı hatası) kırılmaz. Yerel yapı ile `Dockerfile.dev` içindeki `--shamefully-hoist` da uyumludur.

```bash
pnpm install
pnpm prisma:generate
pnpm --filter @pastane/tr-api-errors build
```

**Kök `pnpm install` sonrası çoklu/saf olmayan `node_modules`** (özellikle `apps/*/node_modules` içinde **kırık symlink** kalırsa) yine sorun çıkarabilir — kökü temiz yeniden kurun:

```bash
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
```

**Sadece vitrin / admin / kurye (3000–3002):**

```bash
pnpm dev:web-apps
```

Host’ta **`root` mülkiyetli `.next`** (Docker + `pnpm dev` karışırsa) sorununu bertaraf etmek için alternatif: `pnpm dev:web-apps-host`.

## Doğrulama

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`pnpm check` bu adımları ve üretim derlemesini `pnpm build:ci` ile çalıştırır (önerilir).

Root sahipli veya kilitli `apps/*/.next` klasörleri `pnpm build`’i kırarsa önce `pnpm fix:next-perms` veya `NEXT_DIST_DIR=.next-ci pnpm build` kullanın.

### `.next` izin hataları (`EACCES` / `permission denied`)

Özellikle Docker ile `apps/*` bind mount kullandıktan sonra oluşan **root sahipli** `.next` klasörleri `next build`’i kırar.

- Bir kerelik düzeltme: `pnpm fix:next-perms` (sudo ister), veya elle  
  `sudo chown -R "$(id -u):$(id -g)" apps/admin/.next apps/web/.next apps/courier/.next`
- Alternatif: temiz dizine derleme — `NEXT_DIST_DIR=.next-ci pnpm build`  
  (her Next uygulaması kendi `apps/<app>/` altında `.next-ci` kullanır.)
- **`next dev` 500 / Internal Server Error** ve terminalde `EACCES` / `.next/` görürseniz: çoğunlukla **root sahipli** önbellek; `pnpm fix:next-perms` veya `NEXT_DIST_DIR=/tmp/pastane-admin-next pnpm --filter @pastane/admin dev` ile yazılabilir bir klasör kullanın.
- **Sudo kullanmadan** host’ta çalışmak için: admin/kurye paketlerinde `dev:host` script’i `NEXT_DIST_DIR=.next-host` kullanır. Üç uygulamayı birlikte: `pnpm dev:web-apps-host` (vitrin normal `.next`, admin/kurye `.next-host`).

### Next.js “Internal Server Error” (500) — hızlı kontrol

1. **Terminalde hata var mı?** `EACCES` veya `permission denied` + `.next` → yukarıdaki `fix:next-perms` veya `pnpm dev:web-apps-host`.
2. **Yalnızca host’ta `pnpm dev` kullanıyorsanız** ve Docker önceden `next build` ürettiyse `apps/admin/.next` veya `apps/courier/.next` bazen tamamen `root` olur; Next yazamayınca 500 üretir.
3. **Vitrin takılı / yüksek CPU:** `next dev` sürecini durdurun, `rm -rf apps/web/.next` (sahiplik sizdeyse), yeniden `pnpm --filter @pastane/web dev`.
4. **API yoksa** mağaza sayfaları boş/500 verebilir: `API_URL` veya `pnpm docker:dev:up` + API’nin `3003`’te ayakta olduğundan emin olun.
5. **Docker Compose ve host’ta `pnpm dev` aynı uygulama için aynı anda:** Port çakışması ve host’ta **`root` sahipli `.next`** oluşumu container içindeki `node` kullanıcısında **`EACCES`** (ör. `open '.../.next/server/webpack-runtime.js'`) ile **Internal Server Error** üretir. Tek yöntemi seçin veya host’ta **`pnpm dev:web-apps-host`** kullanın (admin/kurye için ayrı `.next-host` önbelleği).

### Docker + bind mount: pnpm symlink’leri (`node_modules`)

Docker dev servisleri `apps/web|admin|courier` klasörünü host’tan bağlar; pnpm’in oluşturduğu symlink’ler (ör. `apps/web/node_modules/next` → workspace kökü `node_modules/.pnpm/...`) imajda tek başına kurulan klasör yapısıyla uyuşmayabilir. Bu yüzden `docker/docker-compose.dev.yml`, kök **`../node_modules:/app/node_modules`** volume’un da bağlar.

Runtime veya **`next build` sırasında** **`Cannot find module '../../segment'`** görürseniz: sorun **`next/dist/shared/lib/segment.js` dosyasına ulaşılamadan** oluşuyordur — çoğu kez eksik hoist / kırık `apps/*/node_modules` symlink’idir. Yukarıdaki **`shamefully-hoist` + tam `node_modules` temiz yeniden kurulum** ve host’taki kökle hizalı `pnpm install` çözer.

**Not:** `pnpm` yükseltildikten veya bağlayıcı (linker) ayarı değiştirildikten sonra eski `apps/*/node_modules` dizinleri güncellenmeyip **kopuk bağlantılar** bırakabilir; bu durumda da aynı temiz yeniden kurulum gerekir.

### Docker dev: `ENOENT … .pnpm/next@…/dist/…/app-paths.js`

Kök `pnpm install`/`.npmrc`/hoist değiştirdiğinizde **önce üretilmiş** `apps/*/server` webpack önbelleği (`.next-docker`) bazen artık var olmayan **sabit fizik `.pnpm/next@…/node_modules/next/...`** yolunu açmaya çalışır.

**Çözüm:** Frontend konteynerlerini durdurup önbelleği silin — `pnpm fix:frontend-cache` (önerilir). Elle: `.next-docker` klasörünü (`apps/web|admin|courier`) silin ve ilgili servisi `--force-recreate` ile yeniden kaldırın. Ardından sayfayı **hard refresh** yapın (`Ctrl+Shift+R`).

`Dockerfile.dev` içinde **`pnpm`** ayarının kökle aynı olması için `.npmrc` dosyası imaja kopyalanır; köktekü `pnpm install`’tan sonra **`docker compose … build web admin courier`** gerekebilir.

Host’ta `pnpm install` mutlaka **repo kökünde** çalışmış olmalıdır. Volume eksik kalırsa loglarda sırasıyla **`Cannot find module '.../next/dist/bin/next'`** ve **`routes-manifest.json`** ile **Internal Server Error (500)** görülebilir. Çözüm: kökte `pnpm install`, ardından `docker compose --env-file .env -f docker/docker-compose.dev.yml up -d --force-recreate web admin courier`.

### Docker + bind mount: `.next` temizliği (`EACCES`)

Container `USER node` iken host’ta root mülkiyetli `.next` yüzünden Next dosya açamaz.

```bash
pnpm fix:frontend-cache
```

Bu komut frontend container’larını durdurur, `apps/{web,admin,courier}/.next*` önbelleklerini siler ve `NEXT_DIST_DIR=.next-docker` ile yeniden başlatır. Docker dev açıkken host’ta **`pnpm build` yerine `pnpm build:ci`** kullanın; aksi halde eski `.next` klasörü dev CSS’ini bozabilir.

Elle:

```bash
docker compose --env-file .env -f docker/docker-compose.dev.yml stop web admin courier
rm -rf apps/web/.next apps/web/.next-docker apps/admin/.next apps/admin/.next-docker apps/courier/.next apps/courier/.next-docker
docker compose --env-file .env -f docker/docker-compose.dev.yml up -d --force-recreate web admin courier
```

Host’tan geliştirmede Docker’daki `web`/`admin`/`courier` kapalıyken: **`pnpm dev:web-apps`** veya **`pnpm dev:web-apps-host`**.

Yeni dev imajları `node` kullanıcısıyla çalışır; yine de eski root dosyaları için yukarıdaki adımlar gerekebilir.

## Yerel = dev, üretim = yalnızca VPS

**Önerilen model:** Yerelde kodu **`docker-compose.dev.yml`** (`pnpm docker:dev:up`) veya **`pnpm dev:web-apps`** ile geliştirin. **Çalışan üretim** yalnızca VPS üzerindedir (**`ssh ... ./deploy.sh`** veya **`pnpm push:vps`** sonrası sunucuda aynı betik).

Yerelde **prod Docker yığını tutulmaz**: `docker/docker-compose.prod.yml` ve **`Dockerfile.*.prod`** yalnızca **sunucuya klonlanan repoda** `deploy.sh` ile kullanılır. Eski **`pastane_*_prod`** konteynerleri hâlâ açıksa port çakışır; durdurmak için:

```bash
bash scripts/docker-stop-local-prod.sh
pnpm docker:dev:up    # vitrin localhost:3000 (dev), API varsayılan 3003
```

### `localhost:3000` = dev vitrin

Üretikten sonra **pastane_*_prod** konteynerleri hâlâ çalışıyorsa `127.0.0.1:3000` yanlış yığını gösterebilir. **`pnpm docker:dev:up-exclusive`** önce `scripts/docker-stop-local-prod.sh` çalıştırır; ardından dev stack ile **`pastane_web_dev`** ayağa kalkar (**host’taki `apps/web`**).

**API `Bind for …:3003 failed`:** Yerelde **`pastane_api_prod`** `:3003` tutuyorsa **`bash scripts/docker-stop-local-prod.sh`** kullanın — veya **`HOST_DEV_API_PORT`** ile dev API’yi başka bir host portuna taşıyın (`.env` ve `PUBLIC_API_URL` / `NEXT_PUBLIC_API_URL` aynı porta uysun).

### `pnpm push:vps` (VPS’ye deploy)

Repo kökünde:

```bash
pnpm push:vps           # typecheck → git push origin main → VPS ./deploy.sh
pnpm push:vps:fast      # typecheck atlanır; yine VPS
```

Kökte **`.env.production`** dosyanız varsa (çoğu geliştirici yerelde tutmayabilir) `validate-env` push öncesi koşulur; yoksa atlanır (VPS üzerindeki gerçek env etkilenmez).

**RSC / Client Manifest (`global-error.js`, `stringify`):** Host’ta ve container’da aynı `apps/*` klasörü bind mount edildiğinde, biri tarafından üretilmiş bozuk veya başka kökten gelen `.next` önbelleği bazen `Could not find the module ".../global-error.js" in the React Client Manifest` hatasına yol açar. Çözüm: ilgili uygulama için `rm -rf apps/<app>/.next` (veya yazılabilir `NEXT_DIST_DIR`) ve `next dev`’i yeniden başlatın. Repoda her Next uygulaması için `app/global-error.tsx` vardır; manifest kaydı stabilize edilir.

## Dev kod + prod verisi karışmış mı?

Yerelde **aynı zaman damgalı veriyi** doğrulayan tek garanti Compose + env mimarisidir; otomatik tarama için:

```bash
pnpm doctor
```

**Ortam dosyaları** bölümünde **«Dev vs prod veri özeti»** satırına bakın. Aşağı durumlarda uyarı/`fail` verilir:

| Durum | Anlamı |
|--------|--------|
| `.env` ile `.env.production` içinde **aynı `DATABASE_URL`** | Dev kod büyük ihtimalle **üretim veritabanını** kullanıyor — **riskli.** |
| `DATABASE_URL` host’u `postgres`, `localhost`, `127.0.0.1`, `host.docker.internal` **dışında** | Büyük olasılıkla **uzak** DB (staging/canlı/anlık geri yükleme). Bilinçli değilsen iyileştirin. |
| `.env` `NODE_ENV=production` | Yerel için genelde **`development`** olmalı. |
| `PUBLIC_API_URL`, `NEXT_PUBLIC_API_URL`, `WEB_URL` içinde **`azem.cloud`** (tek-kiracı şablonu) | Tarayıcı **canlı ortama** gidebilir; docker dev için `localhost` tercih edin. |

**Mimari kısaltma:**  
- **`docker-compose.dev.yml`**: Postgres/Redis volume’ları **`postgres_dev_*`**, `.env`; API/Web **tek `.env`** okur (`NODE_ENV` genelde development).  
- **`docker-compose.prod.yml`**: Ayrı volume’lar, **`.env.production`**.

## Docker ile tam yığın

Depo kökünde `.env` oluşturun (`.env.example` referansı). Ardından:

```bash
pnpm docker:dev:up-exclusive   # önce yerel prod konteynerlerini güvenli durdur → tam dev stack
pnpm docker:dev:up             # yerel prod yoksa doğrudan dev
```

Servisler: API host’ta varsayılan **`:3003`** (`HOST_DEV_API_PORT` ile değiştirilebilir — üst başlıkta prod çakışması), vitrin `:3000`, admin `:3001`, kurye `:3002`.

**iyzico Checkout Form:** `callbackUrl` doğrudan API’ye gider (`PUBLIC_API_URL` + `/api/v1/payments/iyzico/form-return`). Yerel `localhost`, iyzico sunucularından erişilemediği için gerçek sandbox geri çağrıları genelde **[ngrok](https://ngrok.com/)**, Cloudflare Tunnel veya staging URL ile `PUBLIC_API_URL` olarak dışarıdan erişilen bir adres ayarlamanız gerekir. Ödeme bitince tarayıcı `WEB_URL/odeme?...` adresine yönlenir.

İmajları `Dockerfile.dev` değiştiyse yeniden oluşturun:  
`docker compose --env-file .env -f docker/docker-compose.dev.yml build --no-cache web admin courier`

**API route / servis değişikliği:** `apps/api` container’da kaynak artık `apps/api/src` ile bind mount edilir (`nest start --watch`). Yine de ilk kurulumda veya mount öncesi imaj için:

```bash
# Her dizinden (repo kökünden pnpm ile):
pnpm docker:dev:rebuild-api
```

Eski imajda yeni endpoint yoksa admin’de örn. `GET /api/catalog/products/admin` → **404** (Nest `:id` ile `admin`’i ürün id sanar) görülebilir.
