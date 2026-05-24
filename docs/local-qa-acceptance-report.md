# Local QA acceptance report (pre-VPS production simulation)

**Scope:** [`docker/docker-compose.prod.yml`](../docker/docker-compose.prod.yml), `.env.prod`, Nginx vhosts, stabilization only (no VPS, no mobile, no new product scope).  
**Run date:** 2026-05-19 (agent execution on WSL2).  
**Stack:** `docker compose --env-file .env.production -f docker/docker-compose.prod.yml config`; `docker compose --env-file .env.prod -f docker/docker-compose.prod.yml up -d`; optional `docker compose --env-file .env.production -f docker/docker-compose.prod.yml build`.

---

## Verdict: **Locally production-stable (scoped)**

For the defined scope—**Docker prod Compose**, **internal networks**, **Nginx edge on 80/443**, **migrations on API boot**, **seeded data**, **health + auth + RBAC spot checks**, **resilience restarts**, **backup/restore drill**, and **`SWAGGER_ENABLED=false`**—the system behaves as expected. Full browser E2E across every row in [qa-test-scenarios.md](qa-test-scenarios.md) was **not** exhaustively clicked in this pass; operators should complete the checklist and sign [regression-checklist.md](regression-checklist.md).

**Blocking caveats for a “full parity” label:**

- **HTTPS / `Secure` cookies:** `.env.prod.example` uses `https://` public URLs while local Nginx serves **plain HTTP** unless you add TLS (e.g. mkcert). Expect **partial** session/cookie behavior vs real production until URLs and scheme align.
- **Iyzico:** Empty keys in template env — payment initiation remains **documented skip** unless sandbox keys are supplied.
- **Host port isolation:** Prod Postgres/Redis/MinIO **do not** publish `0.0.0.0` ports; on this machine `nc 127.0.0.1 5432` **succeeded** because a **parallel dev stack** (`pastane_*_dev`) still bound those ports. Stop dev compose when validating prod isolation.
- **Local `pnpm build`:** Failed with **EACCES** on root-owned `apps/*/.next` trees; **`docker compose --env-file .env.production -f docker/docker-compose.prod.yml build` succeeded** (Node 22 in Docker). Fix host ownership per [development-workflow.md](development-workflow.md) for local turbo builds.
- **Toolchain:** Agent host used **Node 20** with engine warning; repo expects **Node 22**.

---

## Bugs found and fixes

| Issue | Severity | Fix |
|-------|----------|-----|
| `scripts/backup-prod.sh` ignored caller `BACKUP_DIR` after `source .env.prod`, so `BACKUP_DIR=/tmp/... ./scripts/backup-prod.sh` still tried `/var/backups/pastane` | High (local QA / automation) | Preserve env-set `BACKUP_DIR` before sourcing `.env.prod` |
| — | — | No other functional regressions observed in automated API/order tests or smoke |

---

## Automated / scripted results summary

| Check | Result |
|-------|--------|
| `GET /api/v1/health` with `Host: api.staging.local` | **200**, postgres/redis/minio true |
| `GET /` with `Host: staging.local` | **200** |
| Admin / courier vhosts | **307** to login (expected) |
| Admin login `905550000001` | **200** + JWT |
| Customer → `GET /users` | **403** |
| `GET /api/docs` | **404** (Swagger off) |
| Rapid failed logins | **401** then **503** from **Nginx** `limit_req` on auth zone (before app-level 429 kicks in at higher volume)—documented behavior |
| `pnpm lint` | **Pass** |
| `pnpm typecheck` | **Pass** |
| `pnpm test` | **Pass** (API Jest includes `orders.service.spec.ts`, etc.) |
| `pnpm build` (host) | **Fail** — EACCES on `.next` |
| `docker compose --env-file .env.production -f docker/docker-compose.prod.yml config` | **Pass** |
| `docker compose --env-file .env.production -f docker/docker-compose.prod.yml build` | **Pass** |
| Prisma seed in API container | **Pass** |
| Resilience (see [runtime-recovery-tests.md](runtime-recovery-tests.md)) | **Pass** api/redis/postgres/minio restart + health |
| Backup to `/tmp/pastane-pg-backups` | **Pass** (after script fix) |
| Restore + API start + login | **Pass** |

---

## Manual E2E (customer / admin / courier)

Structured steps live in [qa-test-scenarios.md](qa-test-scenarios.md). **This run:** relied on curl/API checks and automated tests; **full UI walkthrough** (register, checkout, admin CRUD, courier state machine) is **deferred to human operators** using the same hosts entries and HTTP/HTTPS notes above.

**Queue / timeout workers:** BullMQ runs in-process on the API. Delayed payment/stock timeout jobs were **not** end-to-end timed in this pass (10-minute defaults). Use shortened timeouts in local-only `.env.prod` or extend monitoring; see scenario **API-Queue** in QA doc.

---

## Resilience & backup

Recorded in [runtime-recovery-tests.md](runtime-recovery-tests.md). PostgreSQL **custom-format** backup and **destructive restore** were executed successfully against the local prod stack.

---

## Security checklist (static + smoke)

- **Swagger:** `SWAGGER_ENABLED=false`; `/api/docs` → **404**.
- **Secrets:** `.env.prod` gitignored; example template only in repo.
- **Payment logging:** `IyzicoProvider.sanitize` strips card/CVV fields; no card data logging spotted in provider stub.
- **Upload MIME:** covered by [`mime.util.spec.ts`](../apps/api/src/common/utils/mime.util.spec.ts).
- **RBAC:** customer denied admin list route.
- **Rate limits:** Nginx `pastane_auth` zone + Nest `RateLimit` on auth controller (see QA notes on **503** vs **429** ordering).

---

## Known gaps / next steps

1. Complete **signed** regression checklist after full manual UI pass.  
2. Align **scheme** (`http` vs `https`) for local staging or add TLS.  
3. Add **Iyzico sandbox** keys for payment matrix “full” cell.  
4. Re-run **port isolation** checks with dev stack stopped.  
5. Fix **host** `.next` permissions / use **Node 22** for `pnpm build`.  
6. Phase 5 final alignment: [`final-system-acceptance-report.md`](final-system-acceptance-report.md), [`final-backend-frontend-gap-report.md`](final-backend-frontend-gap-report.md).

---

## Documentation delivered

- [qa-test-scenarios.md](qa-test-scenarios.md)  
- [regression-checklist.md](regression-checklist.md)  
- [runtime-recovery-tests.md](runtime-recovery-tests.md)  
- [final-system-acceptance-report.md](final-system-acceptance-report.md), [final-backend-frontend-gap-report.md](final-backend-frontend-gap-report.md)  
- Cross-links in [AI_HANDOFF_CONTEXT.md](AI_HANDOFF_CONTEXT.md) §14 and §18  
