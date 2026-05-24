# Development Workflow

## Purpose
This repository follows the official phase plan in `docs/development-phases.md`. Work should remain small, explicit, and verifiable.

## Standard flow
1. Read the relevant source docs in `Dokuman/`, the `.cursor/rules/` files, and the official phase plan.
2. Identify the active phase and define what is in and out of scope.
3. List the files to change before editing.
4. Implement only the current phase.
5. Run lint, typecheck, tests, build checks, and Docker verification when relevant.
6. Fix every failure before reporting completion.
7. Stop after the phase and summarize results.

## Docker workflow
- Copy `.env.example` to `.env` for local work.
- Start development services with `pnpm docker:dev:up`.
- Root scripts pass `--env-file .env` explicitly so Compose receives the intended variables.
- **`docker-compose.dev.yml`** bind-mounts **`apps/web`**, **`apps/admin`**, **`apps/courier`**, and **`apps/api`** sources so host edits apply without rebuilding images for small API/UI changes. It also mounts the **workspace root** **`node_modules`** to **`/app/node_modules`** so pnpm symlinks under **`apps/*/node_modules`** (pointing into **`/.pnpm`** at the repo root) resolve correctly inside containers. The image still runs **`pnpm install`**, but the host overlay must match symlink targets. **`apps/web/next.config.ts`** prepends **`/app/node_modules`** to webpack **`resolve.modules`** so hoisted deps (e.g. **leaflet**) resolve when needed. After a corrupted dev cache, delete **`apps/*/.next-docker`** / follow **`pnpm fix:frontend-cache`** and restart **`web`**, **`admin`**, **`courier`**.
- **Adres PATCH / DTO doğrulama:** Nest **`forbidNonWhitelisted`** kullanıyor; güncelliği kaybetmiş **`dist/`** veya yanlış **`PartialType`** kullanımı gövdede **`latitude` / `longitude`** varken **400** üretebilir. **`UpdateAddressDto`** için **`@nestjs/mapped-types`** içindeki **`PartialType`** kullanılıyor (`CreateAddressDto` üzerinde **`@ApiProperty` olmadığından `@nestjs/swagger` PartialType’ı alanları düşürebiliyordu**). Çözüm: güncel kod + **`pnpm --filter @pastane/api build`** veya Compose **`api`** imajını yenileyin; Docker geliştirmede **`api`** **`apps/api`** ile mount edilir — yine de **`package.json` / Dockerfile / kök workspace kopyası** değiştiyse **`docker compose … build api`** gerekir.
- **Storefront home banners:** the web app loads public slides via `GET /api/v1/banners/home` (see `apps/web/lib/catalog/queries.ts`). In Compose, **`WEB_API_URL=http://api:3003`** is set for the `web` service so server-side `fetch` reaches the API by service name. On the host (`pnpm --filter web dev`), **`API_URL`** in `.env` is used as fallback (`http://localhost:3003`). If the hero stays on the static fallback, check that the API is up, env points to it, and admin has **active** banners in range (see `/banners`). Banner and product images are stored in **MinIO**; the API exposes them to the browser via **`GET /api/v1/files/:bucket/:encodedObjectKey`** (paths signed with bucket + object key). **`PUBLIC_API_URL`** (or fallback **`API_URL`**) must be the base URL the **browser** uses to reach the API (e.g. `http://localhost:3003`); Docker Compose sets **`PUBLIC_API_URL=http://localhost:3003`** for the `api` service. `GET /api/v1/banners/home` returns `<img>` URLs pointing at this proxy so MinIO does not need to be reachable from the client.
- **Rebuild the affected service image** when you change **dependencies** (`package.json` / lockfile), **root workspace** files copied in `Dockerfile.dev` (e.g. `eslint.config.mjs` for API), or **Dockerfile** itself:  
  `docker compose --env-file ../.env -f docker/docker-compose.dev.yml build api && docker compose ... up -d api`
- After editing **`packages/database/schema.prisma`**, run `prisma generate` inside the API container (or reinstall) so `@prisma/client` matches the schema.
- Production stack is described in **`docker/docker-compose.prod.yml`** and **`deploy.sh`**; run **`./deploy.sh` on Ubuntu 24.04 LTS VPS**, not production Compose on laptops (see `docs/local-development.md`).

## Database migrations from the host (`pnpm --filter @pastane/database prisma:migrate:deploy`)
- Uses **`packages/database/scripts/prisma-with-root-env.sh`**: loads **monorepo root** `.env`, then runs Prisma (`migrate deploy` / `migrate dev`).
- On the **host** (no `/.dockerenv`), `...@postgres:5432/...` is rewritten to **`127.0.0.1`** so Compose-style `DATABASE_URL` hits the published Postgres port (same opt-out as seed: **`DATABASE_URL_SEED=preserve`**).

## Database seed from the host (`pnpm --filter @pastane/database prisma:seed`)
- The seed script loads the **monorepo root** `.env` automatically (working directory is `packages/database`, so `DATABASE_URL` is otherwise missing).
- If `.env` uses `DATABASE_URL=...@postgres:5432/...` (Docker service name), seed **rewrites `postgres` → `127.0.0.1`** when not running inside a container, so a published Postgres port works from the host. To disable: `DATABASE_URL_SEED=preserve` or set `DATABASE_URL` to a `127.0.0.1` URL explicitly.
- Ensure dev Postgres is up (e.g. `pnpm docker:dev:up`) and port `5432` is reachable.
- Alternatively run seed inside the API container (see `docs/qa-test-scenarios.md`).

## Local build permissions
If `pnpm prisma:generate`, `pnpm build`, or `next build` fails with `EACCES` under `node_modules` or `.pnpm`, some paths were likely created as **root** (e.g. after a container bind-mount). Fix ownership once (replace user/group if needed):

```bash
sudo chown -R "$(whoami):$(whoami)" node_modules apps/*/node_modules packages/*/node_modules
```

Then rerun `pnpm install` if needed and `pnpm typecheck && pnpm build`.

AI agents should prefer shared rules, explicit plans, small diffs, and architecture consistency over speed alone.
