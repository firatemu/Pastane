# Yerel geliştirme

## Gereksinimler

- **Node.js 22** (repo `engines` alanına uyun; Node 20 ile çoğu işlem çalışsa da resmi hedef 22’dir).
- **pnpm** (Corepack: `corepack enable`).
- PostgreSQL, Redis, MinIO: tam yığın için `docker/docker-compose.dev.yml` kullanın.

## Kurulum

```bash
pnpm install
pnpm prisma:generate
pnpm --filter @pastane/tr-api-errors build
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

**RSC / Client Manifest (`global-error.js`, `stringify`):** Host’ta ve container’da aynı `apps/*` klasörü bind mount edildiğinde, biri tarafından üretilmiş bozuk veya başka kökten gelen `.next` önbelleği bazen `Could not find the module ".../global-error.js" in the React Client Manifest` hatasına yol açar. Çözüm: ilgili uygulama için `rm -rf apps/<app>/.next` (veya yazılabilir `NEXT_DIST_DIR`) ve `next dev`’i yeniden başlatın. Repoda her Next uygulaması için `app/global-error.tsx` vardır; manifest kaydı stabilize edilir.

## Docker ile tam yığın

Depo kökünde `.env` oluşturun (`.env.example` referansı). Ardından:

```bash
pnpm docker:dev:up
```

Servisler: API `:3003`, vitrin `:3000`, admin `:3001`, kurye `:3002`.

**iyzico Checkout Form:** `callbackUrl` doğrudan API’ye gider (`PUBLIC_API_URL` + `/api/v1/payments/iyzico/form-return`). Yerel `localhost`, iyzico sunucularından erişilemediği için gerçek sandbox geri çağrıları genelde **[ngrok](https://ngrok.com/)**, Cloudflare Tunnel veya staging URL ile `PUBLIC_API_URL` olarak dışarıdan erişilen bir adres ayarlamanız gerekir. Ödeme bitince tarayıcı `WEB_URL/odeme?...` adresine yönlenir.

İmajları `Dockerfile.dev` değiştiyse yeniden oluşturun:  
`docker compose --env-file .env -f docker/docker-compose.dev.yml build --no-cache web admin courier`

**API route / servis değişikliği:** `apps/api` container’da kaynak artık `apps/api/src` ile bind mount edilir (`nest start --watch`). Yine de ilk kurulumda veya mount öncesi imaj için:

```bash
# Her dizinden (repo kökünden pnpm ile):
pnpm docker:dev:rebuild-api
```

Eski imajda yeni endpoint yoksa admin’de örn. `GET /api/catalog/products/admin` → **404** (Nest `:id` ile `admin`’i ürün id sanar) görülebilir.
