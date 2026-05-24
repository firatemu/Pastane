# Pastane platform

Tek kiracılı pastane operasyonları için monorepo: **NestJS** API, **Next.js** (vitrin, admin, kurye), **Prisma** + PostgreSQL, Redis, MinIO.

## Hızlı başlangıç

1. [Yerel geliştirme rehberi](docs/local-development.md) — kurulum, doğrulama, Docker, bilinen sorunlar.  
2. Ortam değişkenleri: depo kökünde `.env.example` dosyasından `.env` üretin.  
3. Tam doğrulama: `pnpm install && pnpm check` (`lint`, `typecheck`, `test`, üretim derlemesi).

**Node:** depo hedefi **Node 22** (`package.json` → `engines`).

## Yararlı komutlar

| Komut | Açıklama |
|--------|----------|
| `pnpm dev` | Turbo ile paralel geliştirme sunucuları |
| `pnpm docker:dev:up` | PostgreSQL, Redis, MinIO, API ve Next uygulamaları (Compose) |
| `pnpm build:ci` | `NEXT_DIST_DIR=.next-ci` ile sorunsuz üretim derlemesi (kök sahipli `.next` sorunundan kaçınır) |
| `pnpm fix:next-perms` | Docker sonrası root sahipli `apps/*/.next` için `chown` (sudo) |
| `pnpm push:vps` | `main` dalı: `typecheck` → `git push` → VPS’te [`deploy.sh`](deploy.sh) ([`scripts/push-vps.sh`](scripts/push-vps.sh)) |
| `pnpm push:vps:fast` | Aynı akış; `typecheck` atlanır (öncesinde `pnpm typecheck` önerilir) |

Paket düzeni: `apps/api`, `apps/web`, `apps/admin`, `apps/courier`, `packages/*`.

## Production (VPS — Host Nginx)

- Yerel makineden canlı güncelleme: `scripts/deploy-vps.env.local` (`VPS_HOST=…`; şablon: [`scripts/deploy-vps.env.example`](scripts/deploy-vps.env.example)) sonra **`pnpm push:vps`**.
- Compose: [`docker/docker-compose.prod.yml`](docker/docker-compose.prod.yml) — **`api`/`web`/`admin`/`courier`/`minio`(S3)** publish **loopback ports** for Host Nginx; **PostgreSQL ve Redis WAN’a açılmaz**.
- Ingress: VPS üzerinde **Host Nginx** ([`deploy/nginx/pastane-app`](deploy/nginx/pastane-app)). Docker içinde **`nginx` servisi yoktur**.
- Operasyon özeti: [`docs/OPERATIONS.md`](docs/OPERATIONS.md) · azem.cloud runbook: [`docs/azem-cloud-vps-deployment.md`](docs/azem-cloud-vps-deployment.md) · GitHub Actions SSH: [`docs/GITHUB_CI_SSH.md`](docs/GITHUB_CI_SSH.md).
- Yerel doğrulama uygulama kodu için: **`pnpm check`** (**`pnpm build:ci`** üretim tarzı derleme içerir). Tam üretim imaj doğrulaması **yalnızca VPS** üzerinde **`./deploy.sh`** (veya `docker compose … build` ile eşdeğer) yapılır. **Üretim gizli bilgileri** için kök **`/.env.production`** yalnızca sunucuda (veya ihtiyaç halinde güvenli depoda) durmalıdır; repo’ya commit etmeyin.
