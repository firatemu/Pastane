# Phase 4 — Courier panel gap report (pre-implementation)

Backend source: [`apps/api/src/deliveries`](apps/api/src/deliveries), [`apps/api/src/users/users.controller.ts`](apps/api/src/users/users.controller.ts). Frontend: [`apps/courier`](apps/courier).

## 1. Backend courier capabilities found

| Endpoint | Permission | Ownership / role | Response / notes |
|----------|-------------|-------------------|------------------|
| `GET /api/v1/users/me` | JWT | Active user, `deletedAt: null` | User + `role.name`; envelope `{ success, data }` |
| `GET /api/v1/deliveries/my` | `deliveries.viewOwn` | `@Roles(COURIER)`; `courier.userId = sub`, `courier.deletedAt: null` | Paginated → `{ success, data: items, meta }`. Query: `status`, `page`, `limit`. List includes order: `orderNumber`, `status`, `scheduledAt`, `addressSnapshot`, `user` (name, phone) |
| `GET /api/v1/deliveries/my/:id` | `deliveries.viewOwn` | Same | Full row + `order`: `user`, `items` (with `options`, `customNote`), `statusHistory`, `note`, scalars. 404 `DELIVERY_NOT_FOUND` if not owned |
| `PATCH .../my/:id/pick-up` | `deliveries.updateOwn` | Same | Delivery **ASSIGNED → PICKED_UP**; order must be **OUT_FOR_DELIVERY**; sets `pickedUpAt` |
| `PATCH .../my/:id/deliver` | `deliveries.updateOwn` | Same | Delivery **PICKED_UP or OUT_FOR_DELIVERY → DELIVERED**; order **DELIVERED**; sets `deliveredAt` |
| `PATCH .../my/:id/fail` | `deliveries.updateOwn` | Same | Body `{ reason }` 3–500 chars; delivery **FAILED** + `failedReason`; order status **unchanged** |
| Class | — | `@Roles(RoleType.COURIER)` on controller | Non-courier JWT → forbidden |

**Transitions:** [`DeliveryStatusService`](apps/api/src/deliveries/delivery-status.service.ts), [`OrderStatusService`](apps/api/src/orders/order-status.service.ts) (pick-up requires order `OUT_FOR_DELIVERY`).

**Inactive couriers:** Deactivate sets `Courier.deletedAt` + `UserStatus.INACTIVE`; login rejects inactive users — no extra courier-panel screen expected.

**Dead / unused:** `DELIVERY_ACCESS_DENIED` exists in [`ERROR_CODES`](apps/api/src/common/constants/error-codes.ts) but deliveries use `DELIVERY_NOT_FOUND` for wrong id/ownership.

## 2. Current courier frontend coverage

| Area | Coverage |
|------|----------|
| Login / logout / cookies | Yes — [`app/api/auth/login`](apps/courier/app/api/auth/login/route.ts), logout, [`CourierTopbar`](apps/courier/components/layout/courier-topbar.tsx) |
| Route guard | [`requireCourierSession`](apps/courier/lib/auth/session.ts) + [`requireCourierRole`](apps/courier/lib/auth/guards.ts) on `(courier)` layout |
| List `/deliveries` | [`DeliveriesList`](apps/courier/components/deliveries/deliveries-list.tsx), polling 15s |
| Detail `/deliveries/[id]` | [`DeliveryDetailPanel`](apps/courier/components/deliveries/delivery-detail-panel.tsx), polling |
| Pick-up / deliver / fail | [`DeliveryActions`](apps/courier/components/deliveries/delivery-actions.tsx); refetch after mutation |
| Proxy | [`app/api/deliveries/[...path]/route.ts`](apps/courier/app/api/deliveries/[...path]/route.ts) |

## 3. Backend-supported features missing or weak in frontend

1. **Fields not shown:** `failedReason` (FAILED), `pickedUpAt`, `deliveredAt`, `scheduledAt`, order `status`, `statusHistory` (read-only), line `customNote`; list card omits `directions` in address helper (detail includes it).
2. **Types:** `OrderItemOption` uses composite PK — UI typed as `options[].id`; React keys may be wrong.
3. **Errors:** Client ignores `error.code` (e.g. transition vs not found vs validation); English backend messages surface as-is.
4. **Wrong role:** Valid JWT non-courier treated like “no session” → `/login` instead of `/access-denied`.
5. **Stale / refresh UX:** No “last updated” time; silent polling failure vs empty error not distinguished sharply.
6. **401:** Session expired during client fetch — no forced re-login.

## 4. Permission / ownership review

- Backend enforces `deliveries.viewOwn` / `updateOwn` and courier role; ownership merge with **404** for stranger IDs.
- Frontend must not assume 403 for “other courier’s” delivery.
- JWT `permissions` decoded but not used for button gating — acceptable (API is source of truth).

## 5. Required frontend additions/fixes

- Map API errors by `code` + status; redirect **401** to `/login` on client fetches.
- `getCourierSession`: if `/users/me` succeeds and role ≠ COURIER → `redirect('/access-denied')`.
- Align TS types with Prisma JSON shape; stable keys for options.
- Display timestamps, fail reason, order status label, short history, notes; align list address with detail.
- Show last successful refresh time; on poll error while data exists, non-blocking warning (keep data).

## 6. Backend blockers

**None** identified for Phase 4 scope. No service change required for the gaps above.

## 7. Out of scope

Customer web, admin, mobile app, VPS, maps, live tracking, notifications UI, analytics, new workflows, order failure state changes on `deliveries.fail`.

## 8. Recommended implementation order

1. Gap report (this file, §1–8).
2. `courierFetch` / envelope parsing + error map + 401 handling.
3. Session wrong-role → `/access-denied`.
4. Types + option keys + detail/list field visibility.
5. Stale / last-refreshed + poll error affordance.
6. Lint/typecheck/test/build + docs + acceptance report.

## 9. Post-implementation summary

Delivered: gap report §1–8; courier **API client** parses `success`/`error.code`, **401** → login; **wrong role** → `/access-denied`; **types** aligned (`OrderItemOptionRow`, `orderItemOptionKey`); **UI** shows backend fields (timestamps, fail reason, order status + Turkish labels, history, notes, directions); **polling** shows last refresh + stale warning; **Docker** `RUNNING_IN_DOCKER` + `getCourierApiBaseUrl` host parity. **Backend:** no changes. **Tests:** `pnpm lint`, `pnpm typecheck`, `pnpm test` pass; **`pnpm --filter @pastane/courier build`** pass; root **`pnpm build`** may fail on **`EACCES`** under `apps/web/.next` (environment).  

**Phase 4 courier coverage:** **accepted** (operator smoke: `docs/phase-4-courier-acceptance-report.md`).
