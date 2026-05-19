# Phase 3 — Admin panel gap report (pre-implementation)

This document satisfies **Step 3** of the Phase 3 plan: backend capabilities vs `apps/admin` coverage, mismatches, and implementation targets.

## 1. Backend admin capabilities found (summary)

API base: `/api/v1`. Successful JSON uses `{ success: true, data: ... }` unless otherwise noted. Standard permission guard: `@Permissions('code')` on routes below.

| Domain | Key routes | Permissions |
|--------|------------|-------------|
| Auth | `POST auth/login`, refresh, logout | Public / authenticated |
| Users | `GET/PATCH users`, `GET/PATCH users/:id` | `users.view`, `users.update` |
| Roles | `GET roles`, `GET roles/:name` | `roles.view` (class-level) |
| Permissions | `GET permissions` | `permissions.view` |
| Products | Public list/slug/get; `POST/PATCH/DELETE products`, options, allergens | `products.*` |
| Categories | CRUD | `categories.*` |
| Allergens | CRUD | `allergens.*` (see controller) |
| Media | `POST media/upload`, `GET/DELETE media/:id` | `media.upload`, `media.delete` |
| Stock | list windows, create window, movements | `stock.*` |
| Stores | CRUD | `stores.*` or `settings.update` (verify controller) |
| Delivery zones | CRUD | `delivery-zones.*` or `settings.update` |
| Orders | list, get, `PATCH status`, `POST assign-courier` | `orders.viewAll`, `orders.updateStatus`, `orders.assignCourier` |
| Couriers | list, get, create, patch, deactivate, reactivate | `couriers.view`, `couriers.create`, `couriers.update` |
| Deliveries | Courier-oriented | `deliveries.*` |
| Reviews | moderation | `reviews.moderate` |
| Banners | admin list/CRUD/reorder, media upload via service | `banners.*` |
| Loyalty | `me`, `me/movements`, `scan`, `redeem`, `adjust`, `settings` GET/PATCH | customer vs `loyalty.manageSettings` for admin ops |
| Campaigns | list, `POST`, `PATCH :id`, `DELETE :id`; public `active` | `campaigns.view/create/update/delete` |
| Settings | `GET` list, `GET system`, `PATCH :key`, `PATCH system/flags` | `settings.view`, `settings.update` |
| Notifications | `GET me`, `POST send` | `notifications.viewOwn`, `notifications.send` |
| Audit | `GET` (last 200, no filters) | `audit.view` |
| Reports | `GET dashboard-summary`, `sales/summary`, `products/summary` (+ optional `QueryReportRangeDto`) | `reports.sales`, `reports.products` |

**Seed anomalies (non-blocking for UI):**

- `loyalty.viewReports` — defined in seed; **no controller** route uses it (dead permission).
- `notifications.manage` — defined in seed; **no** `@Permissions('notifications.manage')` (dead permission).
- `reports.couriers`, `reports.customers`, `reports.loyalty` — seed only; **no** report endpoints implemented.

## 2. Current admin frontend coverage

| Area | Admin UI |
|------|----------|
| Dashboard + live metrics | Yes (`/dashboard`, `DashboardLiveMetrics`) |
| Products, categories, allergens, banners, stock, stores, zones | Yes |
| Orders + detail + status actions | Yes |
| Courier assignment | Yes |
| Couriers CRUD UI | Yes (`CouriersManager`) |
| Reviews moderation | Yes |
| Reports summary | Yes |
| Loyalty, campaigns, settings, notifications send, audit, users | **Missing pages** before Phase 3 implementation |

Proxy: catch-all `/api/catalog/*` → Nest with Bearer cookie.

## 3. Backend-supported features missing in frontend (before fix)

1. **Loyalty admin**: settings read/update, manual adjust (points + userId/qrCode + note).
2. **Campaigns**: list + create/edit/delete (soft) per DTOs.
3. **Settings**: read all settings + system flags; patch single key + system flags.
4. **Notifications**: send (`userId`, `type`, `title`, `body`, optional `metadata`).
5. **Audit**: read-only list (`GET /audit`).
6. **Users** (optional ops): list + detail + `PATCH` for ADMIN (`users.view` / `users.update`).

## 4. Permission / route guard notes

- Sidebar uses `can(..., required)` with **OR** semantics (`required.some`).
- **Kurye yönetimi** nav: `couriers.create` **veya** `couriers.update` (sayfa `requirePermission` aynı OR mantığı).
- **Allergens** nav lists `allergens.view` OR `permissions.manage` — matches loose visibility.

## 5. Required UI additions (post-implementation checklist)

- New routes with `requirePermission` matching backend.
- RHF + Zod per DTO; confirmations on destructive actions; no plaintext password display after create.
- `CouriersManager`: gate create/edit/deactivate/reactivate by `couriers.create` / `couriers.update`.

## 6. Backend blockers

**None** for covered features. Reports **shape** mismatch fixed in admin mapping (no business-logic change).

## 7. Out of scope

Customer web, courier app, mobile, VPS deploy, new report modules (`reports.couriers` etc.), payment refund UI unless later phase.

## 8. Implementation order (executed)

1. Reports contract fix + date range UI.
2. Audit page.
3. Settings page.
4. Notifications send.
5. Campaigns CRUD.
6. Loyalty admin.
7. Couriers permission UI.
8. Users list/detail (admin).

## 9. Post-implementation summary

Delivered in `apps/admin`: routes `audit`, `settings`, `notifications`, `campaigns`, `loyalty`, `users`; components under `components/operations/*`; `reports-summary` parses `data.topProducts` and supports `startDate`/`endDate`; `CouriersManager` gates UI with `can()`; `lib/api/client.getAdminApiBaseUrl` aligns host vs Docker `api` hostname; Docker Compose admin service sets `RUNNING_IN_DOCKER=1`. `pnpm lint`, `pnpm typecheck`, `pnpm test` pass on workspace. Full `pnpm build` may fail locally if `.next` output dirs are root-owned (fix ownership or remove before build).

**Phase 3 admin coverage: accepted** (pending operator smoke in a running environment).

