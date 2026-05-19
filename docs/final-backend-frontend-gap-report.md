# Final backend ↔ frontend gap report (Phase 5)

**Date:** 2026-05-19  
**Purpose:** System-wide inventory before VPS staging; **no redesign**, alignment and operational truth only.

---

## 1. Backend capability inventory summary

API base `/api/v1`. Success envelope typically `{ success: true, data }` (paginated list uses `data` + `meta`). Auth via JWT unless `@Public()`.

| Domain | Customer | Admin | Courier | Backend-only / internal | Notes |
|--------|----------|-------|---------|---------------------------|-------|
| Auth | register/login/refresh/logout | login | login | — | Shared [`auth.controller`](apps/api/src/auth/auth.controller.ts) |
| Users | `me`, `me` PATCH (own) | `users` list/get/patch | — | — | Admin needs [`users.view`/`update`](apps/api/src/users/users.controller.ts) |
| Roles | — | `GET /roles`, `GET /roles/:name` | — | — | [`roles.view`](apps/api/src/roles/roles.controller.ts) class-level |
| Permissions | — | `GET /permissions` | — | — | [`permissions.view`](apps/api/src/permissions/permissions.controller.ts) |
| Products | public list/slug/get | CRUD + options/allergens | — | — | [`products.controller`](apps/api/src/products/products.controller.ts) |
| Categories | public tree/slug/get | CRUD | — | — | |
| Allergens | — | CRUD | — | — | |
| Media | — | upload/delete | — | — | |
| Public files | URL access | — | — | CDN-style | [`public-files.controller`](apps/api/src/media/public-files.controller.ts) |
| Stock | — | windows/movements | — | — | |
| Stores | public list/get | CRUD `settings.update` | — | — | |
| Delivery zones | public list | CRUD `settings.update` | — | — | |
| Cart | full | — | — | — | [`cart.controller`](apps/api/src/cart/cart.controller.ts) own-cart |
| Orders | create/list own/detail | list all, status, assign | — | — | |
| Payments | initiate/view own | — | — | callbacks | [`payments.controller`](apps/api/src/payments/payments.controller.ts); no admin refund UI |
| Couriers | — | list/get/create/update/deactivate | — | — | |
| Deliveries | — | — | `my*` only | — | [`@Roles(COURIER)`](apps/api/src/deliveries/deliveries.controller.ts) |
| Reviews | create/view | moderate | — | — | |
| Loyalty | me/movements; scan/redeem N/A customer UI for scan in web? | manage settings/adjust | — | — | Web dashboard uses loyalty APIs |
| Notifications | `me` | `send` | — | — | |
| Campaigns | public `active` | CRUD | — | — | |
| Settings | — | list/system/patch | — | — | |
| Banners | public home | CRUD | — | — | |
| Audit | — | list (200) | — | — | |
| Reports | — | dashboard, sales, products | — | — | No `reports.couriers` etc. routes |
| Addresses | manage own | — | — | — | |
| Health | — | — | — | ops | `GET /health` or similar |

---

## 2. Frontend coverage summary

| Surface | Routes / patterns | Proxy / API URL |
|---------|-------------------|-----------------|
| **Web** [`apps/web`](apps/web) | Storefront, auth, account (`hesabim`, `adresler`, `sepet`, `odeme`, `siparisler`), BFF under `app/api/*` | `getWebApiBaseUrl` + `RUNNING_IN_DOCKER` pattern |
| **Admin** [`apps/admin`](apps/admin) | Dashboard, catalog, orders, couriers, banners, campaigns, loyalty, settings, notifications, audit, users, reports, … | `/api/catalog/*` → [`getAdminApiBaseUrl`](apps/admin/lib/api/client.ts) |
| **Courier** [`apps/courier`](apps/courier) | Deliveries list/detail, actions, session | `/api/deliveries/*` → [`getCourierApiBaseUrl`](apps/courier/lib/api/client.ts) |

---

## 3. Remaining uncovered backend capabilities

| Capability | Backend | Frontend | Severity |
|------------|---------|----------|----------|
| `GET /roles` | Yes | **Was missing** admin UI | Operational clarity |
| `GET /permissions` | Yes | **Was missing** admin UI | Operational clarity |
| `deliveries.viewAll` on ORDER_OPERATOR | **Not enforced in API** (no route) | N/A | **Seed/permission lie** |
| `loyalty.viewReports`, `notifications.manage`, extra `reports.*` codes | In seed / docs | No routes | Dead / future |
| Payment refund / `payments.viewAll` | Partially in permission seed | No admin refunds UI | **Intentional** pre-VPS |
| `reviews.view` for operator | API supports | Admin uses moderate; operator seed has `reviews.view` | Low — list/moderation paths differ |

---

## 4. Critical operational blockers before VPS

**None** requiring new business modules.  
**Correction recommended:** Remove misleading `deliveries.viewAll` from `ORDER_OPERATOR` seed — **no** `deliveries.viewAll` controller guard exists.

---

## 5. Permission / ownership inconsistencies

- **ORDER_OPERATOR** + `deliveries.viewAll`: seed grants permission with **zero** matching `@Permissions('deliveries.viewAll')` in codebase (**verified**).
- **COURIER** + `orders.viewOwn`: seeded; courier panel uses **deliveries** embed only — acceptable; separate order API not exposed on courier app by design.
- **Dead codes** (document only unless seed cleanup agreed): `loyalty.viewReports`, `notifications.manage`, `reports.couriers|customers|loyalty` without routes.

---

## 6. Shared architecture inconsistencies

- All three apps use Docker-vs-host API base URL helpers (web, admin, courier) — **aligned** after prior phases.
- BFF + Bearer cookie pattern consistent per app.

---

## 7. Runtime / Docker inconsistencies

- Dev Compose: web/admin/courier set `RUNNING_IN_DOCKER` where applied — courier included in Phase 4.
- **Local `pnpm build`**: may hit `EACCES` on `.next` when Docker owned — environment, not logic.

---

## 8. Recommended fixes

| ID | Fix | Type |
|----|-----|------|
| R1 | Remove `deliveries.viewAll` from `ORDER_OPERATOR` in [`seed.ts`](packages/database/prisma/seed.ts) | Seed truth |
| R2 | Admin read-only **Roller** (`/roles`) and **İzinler** (`/permissions`) for `roles.view` / `permissions.view` | Coverage |
| R3 | Document dead permissions in acceptance report; optional future seed migration to detach unused codes from roles only (not done here beyond R1) | Docs |

---

## 9. Explicit out-of-scope items

- VPS deploy, Nginx/TLS production cutover, mobile app.
- Payment refund UI, admin payment ledger, speculative report endpoints.
- Map/live tracking, push notification UI on courier.
- UI redesign / marketing polish phase.

---

## 10. Final pre-VPS risk assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Operator believes they can “view all deliveries” | Medium (before R1) | R1 + docs |
| RBAC drift undocumented | Low | R2 + handoff |
| `.next` ownership breaking CI/local build | Low | chown / docker build |

---

## Implementation triage (before coding)

| Item | Decision |
|------|----------|
| R1 Seed `deliveries.viewAll` on operator | **blocker / fix** — misrepresents API |
| R2 Admin roles + permissions pages | **obvious missing reflection** — backend already supports |
| Dead permissions global cleanup | **out-of-scope** for this pass (risky DB churn); R1 only |
| New deliveries admin list API | **out-of-scope** — new capability |

---

## Post-implementation note (2026-05-19)

- **R1:** `deliveries.viewAll` removed from `ORDER_OPERATOR` in [`seed.ts`](../packages/database/prisma/seed.ts) (permission remains in global catalog for ADMIN / future use).
- **R2:** Admin salt okunur **`/roles`** ve **`/permissions`** sayfaları eklendi (`roles.view` / `permissions.view`); [`NAV_ITEMS`](../apps/admin/lib/permissions/constants.ts) güncellendi.
- **Doğrulama:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm docker:prod:config` geçti; `pnpm build` host üzerinde **EACCES** (`.next` sahipliği) — bilinen ortam sınırı.
