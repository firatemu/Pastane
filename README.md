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

Paket düzeni: `apps/api`, `apps/web`, `apps/admin`, `apps/courier`, `packages/*`.
