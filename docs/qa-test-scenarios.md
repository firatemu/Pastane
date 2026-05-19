# QA test scenarios (local production simulation)

This document describes structured manual and scripted checks for the **production Docker stack** ([`docker/docker-compose.prod.yml`](../docker/docker-compose.prod.yml)) with **hosts-based staging** names. Use it before VPS cutover and after meaningful changes to API, auth, orders, or Docker/Nginx.

## Prerequisites

### `/etc/hosts` (developer machine)

Add static mappings (adjust if you use another loopback):

```text
127.0.0.1 staging.local api.staging.local admin.staging.local courier.staging.local storage.staging.local
```

### Environment

- Copy [`.env.prod.example`](../.env.prod.example) to `.env.prod` (gitignored). Never commit real secrets.
- For **local simulation without TLS**, use `http://` URLs for `WEB_URL`, `API_URL`, `ADMIN_URL`, `COURIER_URL`, `NEXT_PUBLIC_*`, and `MINIO_PUBLIC_URL` so browsers and server-side fetches match Nginx (plain HTTP on port 80). With `https://` URLs but HTTP-only Nginx, **Secure** cookies and mixed-content issues can break sessions; document that limitation in the acceptance report.
- Set `SWAGGER_ENABLED=false` for prod-style runs.

### Stack

```bash
pnpm docker:prod:config
docker compose --env-file .env.prod -f docker/docker-compose.prod.yml up -d
```

The API container entrypoint runs `prisma migrate deploy` on start ([`docker/docker-entrypoint-api.sh`](../docker/docker-entrypoint-api.sh)). To (re-)load demo data:

```bash
docker compose --env-file .env.prod -f docker/docker-compose.prod.yml exec api sh -lc \
  'cd /app/packages/database && npx prisma db seed --schema=schema.prisma'
```

**Backup on a workstation:** `.env.prod` may set `BACKUP_DIR` to a root-only path. Override when invoking the script so it is not overwritten after sourcing the env file, for example:

```bash
BACKUP_DIR=/tmp/pastane-pg-backups bash scripts/backup-prod.sh
```

### Nginx default server vs API

Traffic to **port 80 without a matching `Host`** may hit Nginx’s **default** server (customer **web**), not the API. Always send the correct **`Host`** header (or use the browser with hosts entries).

## Smoke tests (curl)

- **API health via Nginx:**

  ```bash
  curl -sS -o /dev/null -w '%{http_code}\n' \
    -H 'Host: api.staging.local' http://127.0.0.1/api/v1/health
  ```

  Expect `200` and a JSON body with a healthy status.

- **Customer web (hosts `staging.local`):**

  ```bash
  curl -sS -o /dev/null -w '%{http_code}\n' -H 'Host: staging.local' http://127.0.0.1/
  ```

  Expect `200`.

- **Direct API port (should not be published in prod compose):**  
  With a correct prod compose, `postgres`, `redis`, `minio`, and `api` must **not** expose host `ports:` except through Nginx. Verify with `docker compose ... ps` and optional `ss -tlnp` / `nc` tests (see [runtime-recovery-tests.md](runtime-recovery-tests.md)).

## Seeded demo data ([`packages/database/prisma/seed.ts`](../packages/database/prisma/seed.ts))

| Role    | Phone        | Email               | Password     |
|---------|--------------|---------------------|--------------|
| Admin   | 905550000001 | admin@pastane.com   | Admin123!    |
| Operator| 905550000002 | operator@pastane.com| Operator123! |
| Product | 905550000003 | product@pastane.com | Product123!  |
| Courier | 905550000004 | kurye1@pastane.com  | Courier123!  |
| Courier | 905550000005 | kurye2@pastane.com  | Courier123!  |
| Customer| 905550000010 | musteri@pastane.com | Customer123! |

Categories, products (including option groups on the cake), stock windows for **today** (Europe/Istanbul calendar day), delivery zones (e.g. Yenişehir, Mezitli), and loyalty settings are seeded.

## Customer web (`http://staging.local`)

Exercise in browser with DevTools Network open where noted.

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| CW-01 | Home / catalog | Open `/`, navigate categories | Products list; hero shows CMS banners when configured, else static fallback; no persistent 5xx |
| CW-02 | Product detail | Open a seeded product; view options/allergens | Correct price and options |
| CW-03 | Register | Register new customer (phone OTP flow per `OTP_ACTIVE`) | Account created or clear validation errors |
| CW-04 | Login / session | Login as `905550000010` / `Customer123!`; refresh | Session persists per cookie settings |
| CW-05 | Logout | Logout | Session cleared; protected routes redirect |
| CW-06 | Cart | Add item; optional customization | Cart totals and lines match API |
| CW-07 | Checkout validation | Submit incomplete address / below minimum | Field and business-rule errors from API |
| CW-08 | Delivery fee | Choose delivery zone (e.g. Yenişehir) | Fee matches seeded zone |
| CW-09 | Payment | Initiate Iyzico checkout | With **sandbox keys**: redirect or token as designed; **without keys**: blocked at initiate—document as known limitation |
| CW-10 | Orders | List and open order detail | Data matches backend |
| CW-11 | Reviews | After delivered order (if applicable): create review | Eligibility enforced server-side |
| CW-12 | Protected route | Visit account/orders logged out | Redirect to login |

**SEO / metadata:** View source or Elements on product and home; title and meta tags present per Next.js implementation.

### Customer account area

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| CW-13 | Account dashboard | Login as customer and open `/hesabim` | Profile, quick links, loyalty, recent orders, default address, reviews, notifications load from backend data |
| CW-14 | Profile update | Edit first/last name or email from `/hesabim` | Own profile updates only; no admin-only fields exposed |
| CW-15 | Password change | Change password with current password | Password changes with validation; invalid current password is rejected |
| CW-16 | Address management | Open `/adresler`, add/default/delete own address | Only own addresses are visible/mutable; checkout address list reflects changes |
| CW-17 | Customer ownership | Attempt to open another customer's order/detail via URL/API | Access is denied or not found; no foreign customer data leaks |

Additional local account test credentials used during customer-account alignment: `05428252015` / `84238423`.




## Customer authenticated account coverage

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| CW-ACCOUNT-20 | Account dashboard coverage | Login as customer and open `/hesabim` | Profile, phone verification, loyalty points/QR/movements, recent orders, default address, notifications, and review history use real backend data. |
| CW-ACCOUNT-21 | Address full CRUD | Open `/adresler`; create, edit, set default, delete | All operations refetch backend state; only own addresses are visible; one default address remains. |
| CW-ACCOUNT-22 | Cart backend field coverage | Add product with options; open `/sepet` | Cart line uses backend cart `unitPrice`, selected option price modifiers, quantity controls refetch after mutation, and no authoritative frontend total is invented. |
| CW-ACCOUNT-23 | Checkout payment visibility | Create order and initiate payment | Order totals, service fee, loyalty discount if present, and latest payment status come from backend; payment endpoint array handling works. |
| CW-ACCOUNT-24 | Order detail delivery/payment coverage | Open `/siparisler/[id]` | Address snapshot or pickup store, delivery/courier status if present, status history timestamps, payment records, totals, and review eligibility are visible. |
| CW-ACCOUNT-25 | Ownership protection | Try another customer order/address id through UI/proxy | Backend returns 404/403; UI shows safe error and does not leak data. |
## Customer public storefront coverage

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| CW-PUBLIC-01 | Homepage backend-driven sections | Open `/` with API running | Home banner area renders active in-window banners when present; category strip uses backend categories; active campaigns, stores, and delivery zones render from public endpoints or safe empty states. |
| CW-PUBLIC-02 | Category metadata/content | Open `/kategori/[slug]` for an active category | Category name, description, image when present, child category links, canonical metadata, and active products are shown. |
| CW-PUBLIC-03 | Product card coverage | Open home/category listing | Product cards show real image, price/discount, preparation time when present, option availability, and allergen summary when present. |
| CW-PUBLIC-04 | Product detail public fields | Open `/urun/[slug]` | Gallery, allergens, active option groups/options, preparation time, approved reviews, Product JSON-LD, and breadcrumb JSON-LD are present. |
| CW-PUBLIC-05 | Public reviews rule | Compare `/api/v1/reviews/product/:productId` with product detail | Only approved, non-deleted reviews appear; pending/rejected reviews are not shown. |
| CW-PUBLIC-06 | Public campaigns rule | Compare `/api/v1/campaigns/active` with homepage | Only active, valid-date campaigns appear; expired/inactive/deleted campaigns are not shown as real offers. |
## Admin (http://admin.staging.local)

| ID                       | Scenario        | Steps | Expected |
|--------------------------|-----------------|-------|----------|
| AD-01 | Login | `905550000001` / `Admin123!` | Lands on dashboard |
| AD-02 | RBAC | Login as OPERATOR or PRODUCT_MANAGER | Menus match role |
| AD-03 | Catalog CRUD | Categories / products / allergens | CRUD works; images if MinIO configured |
| AD-03b | Homepage banners | As **Admin**: `/banners`; upload desktop+mobile; set schedule; save; reorder; toggle active; verify `GET /api/v1/banners/home` (curl or Network) | Inactive / future / expired / soft-deleted excluded on storefront; **`banners.*` not in PRODUCT_MANAGER/OPERATOR seed** — expect 403 on admin routes |
| AD-04 | Stock | Stock windows / movements | Matches seed; adjustments persist |
| AD-05 | Stores / zones | Stores, delivery zones | Seeded zones visible |
| AD-06 | Orders | List, detail, status change | No optimistic status UI; refetch after mutation |
| AD-07 | Courier assign | Assign courier to order | Delivery row created; courier sees task |
| AD-08 | Reviews | Moderation queue | State transitions persist |
| AD-09 | Reports | Open sales/dashboard reports | Data loads or empty-state |
| AD-10 | Settings | App settings | Updates persist |
| AD-11 | Courier management | As **Admin**: open `/couriers`; create courier with phone+password; edit profile; deactivate (confirm); reactivate | Mutations succeed; courier panel login works for active courier; inactive cannot login; operator role has no nav/route access to `/couriers` |
| AD-12 | Roller ve izinler | ADMIN: `/roles`, `/permissions` | Salt okunur tablolar; API `GET /roles`, `GET /permissions` |

## Courier (`http://courier.staging.local`)

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| CO-01 | Login | `905550000004` / `Courier123!` | Delivery list |
| CO-02 | Detail | Open assigned delivery | Order/customer/address/items/history match API; timestamps + order status visible; **tutar özeti**, **ödeme rozeti**, **tel:**, satır birim/tahmini tutar |
| CO-08 | List enrichment | Open `/deliveries` with multiple tasks | **Gruplar** (aktif / bugün tamamlanan / bugün başarısız / önceki); üstte özet sayılar; kartlarda teslimat tipi + ödeme + kalem sayısı + toplam (API alanları varsa) |
| CO-03 | Pickup / deliver / fail | Execute state transitions | Refetch shows backend state; invalid transitions show Turkish error |
| CO-04 | Ownership | Open `/deliveries/{id}` for another courier’s UUID (or curl with wrong token) | **404** / not found messaging per API; no foreign task data |
| CO-05 | Polling | Watch Network tab | Interval polling; stale warning if refresh fails while old data kept |
| CO-06 | Non-courier | Log in as ADMIN in browser, browse to courier app with that session | **Erişim reddedildi** (`/access-denied`) |
| CO-07 | Session expiry | Invalidate/revoke token then trigger a list/detail refresh | **401** path leads to login |

## API / integration spot checks

| ID | Scenario | How | Expected |
|----|----------|-----|----------|
| API-01 | Health | `curl` health via Nginx | 200 |
| API-02 | Auth rate limit | Many rapid `POST /api/v1/auth/login` | 429 after policy threshold |
| API-03 | Login | `POST /api/v1/auth/login` JSON `phone` + `password` | 200 + tokens for valid seed user |
| API-04 | RBAC | Call admin-only route with customer access token | 403 |
| API-05 | Stock / payment | Run Jest: `orders.service.spec.ts`, payment specs | Pass in CI/local |
| API-06 | Public banners | `curl -sS -H 'Host: api.staging.local' http://127.0.0.1/api/v1/banners/home` | 200 JSON; only active, in-window, non-deleted banners |

Example login (replace host and scheme with your `.env.prod`):

```bash
curl -sS -H 'Host: api.staging.local' -H 'Content-Type: application/json' \
  -d '{"phone":"905550000001","password":"Admin123!"}' \
  http://127.0.0.1/api/v1/auth/login
```

## Queue / timeout workers ([`TimeoutWorkersService`](../apps/api/src/jobs/timeout-workers.service.ts))

BullMQ runs **in-process** on the API with Redis.

**Procedure:**

1. Ensure Redis and API are healthy.
2. Create a **pending payment** or stock reservation scenario (via checkout or test harness).
3. Observe delayed jobs: API logs or Redis `KEYS` / BullMQ dashboard if enabled (not required for pass/fail).
4. For **local-only** validation, optionally shorten `PAYMENT_TIMEOUT_MS` / `STOCK_RESERVATION_TIMEOUT_MS` in `.env.prod`, restart API, and repeat—**revert** timeouts after the drill.

Document whether timeouts fired as expected in the acceptance report.

## Checkout / payment matrix

                   Iyzico sandbox in `.env.prod` | No payment keys
------------------|----------------------------------|------------------
Initiate checkout | Full flow to provider mock      | Fails at initiate; **expected**—record in report
Order created     | Per implementation               | May stop before pay—OK if documented

## Admin panel coverage (pre-VPS)

Exercise new or touched screens with **ADMIN** account (seed `admin@pastane.com`):

1. `/audit` — table loads (200 rows max).
2. `/settings` — view list; with `settings.update` toggle flags and save; optional JSON key patch with valid JSON.
3. `/notifications` — send test IN_APP to a known customer `userId`.
4. `/campaigns` — create, edit, soft-delete (confirm dialog).
5. `/loyalty` — add settings row; manual point adjust with `userId` or QR.
6. `/users` — list; patch non-destructive fields.
7. `/reports` — sales + top products; try date range.
8. `/couriers` — verify buttons respect role permissions.
9. `/roles` — read-only role list with permission codes (ADMIN).
10. `/permissions` — read-only permission code list (ADMIN).

**ORDER_OPERATOR**: confirm `/notifications` visible if seeded with `notifications.send`; confirm `/settings` hidden without `settings.view`.

## Stock concurrency

Prefer automated coverage in [`orders.service.spec.ts`](../apps/api/src/orders/orders.service.spec.ts) and related tests. Optional manual: two parallel API clients reserving last unit—one should fail with a clear error.

## Execution log (fill per run)

| Date | Operator | Stack commit / tag | Customer | Admin | Courier | API | Notes |
|------|----------|-------------------|----------|-------|---------|-----|-------|
| 2026-05-19 | Agent / automation | docker-compose.prod + `.env.prod` | Partial | Partial | Partial | Pass | [local-qa-acceptance-report.md](local-qa-acceptance-report.md); full UI for humans |

---

## Phase 5 — Turkish UX QA (form, API, auth, empty/loading/error copy)

Verify **no English user-facing strings** on primary surfaces (labels, buttons, validation, toasts, empty states, permission pages, document titles/descriptions). API **codes** and JSON-LD `@type` values may stay English.

| App | Spot checks |
|-----|-------------|
| **Customer** | `/giris` wrong password → Turkish; `/kayit` Zod messages; `/adresler` required fields; `/odeme` kart alanları + Zod (ay/yıl/CVC); sipariş **Yorum** formu; breadcrumb **erişilebilirlik etiketi** (Sayfa konumu). |
| **Admin** | Login validation; ürün / stok / kurye formları; `/access-denied` ve gösterge paneli üst etiketi. |
| **Courier** | Login; başarısız teslimat **neden** formu (Zod); metadata başlık/açıklama. |

Shared Nest API hata eşlemesi: [`packages/tr-api-errors`](../packages/tr-api-errors/) (`@pastane/tr-api-errors`).

---

See also: [regression-checklist.md](regression-checklist.md), [runtime-recovery-tests.md](runtime-recovery-tests.md), [production-deployment-plan.md](production-deployment-plan.md).
