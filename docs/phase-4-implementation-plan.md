# Phase 4 Implementation Plan — Admin Operations

## 1. Scope boundary

Phase 4 will include only:
- the backend support surface required by the admin panel,
- the admin application in `apps/admin`,
- basic operational reporting needed by the dashboard.

Explicitly excluded:
- courier panel UI
- customer-facing web pages
- loyalty UI
- campaigns UI
- notifications UI
- refunds
- advanced analytics

Implementation order is intentionally backend-first so the admin UI is built against stable contracts.

---

## 2. Backend implementation order

### 2.1 Orders admin support

Implement first:
1. `GET /orders`
2. admin/operator-aware `GET /orders/:id`
3. `PATCH /orders/:id/status`
4. `POST /orders/:id/assign-courier`

### 2.2 Couriers support

Implement next:
5. `GET /couriers`

### 2.3 Reviews moderation support

Then:
6. `GET /reviews/pending`
7. `PATCH /reviews/:id/approve`
8. `PATCH /reviews/:id/reject`
9. `DELETE /reviews/:id`

### 2.4 Dashboard/basic reports

Finally add:
10. dashboard/report summary endpoints for Phase 4 widgets only

Recommended minimum backend surface:
- `GET /reports/dashboard-summary`
- `GET /reports/sales/summary`
- `GET /reports/products/summary`

These should stay lightweight and operational, not become Phase 8 analytics early.

---

## 3. Backend files to create or change

### 3.1 Existing files to change

| File | Planned change |
|---|---|
| `apps/api/src/app.module.ts` | Register new Phase 4 modules |
| `apps/api/src/orders/orders.controller.ts` | Add admin list, admin detail path behavior, status update, assignment endpoints |
| `apps/api/src/orders/orders.service.ts` | Add filtered list, admin detail lookup, status update, assignment logic |
| `apps/api/src/orders/order-status.service.ts` | Reuse centralized transition validation; extend only if needed by admin workflow |
| `apps/api/src/common/constants/error-codes.ts` | Add courier/review/report/admin-order error codes |
| `packages/database/schema.prisma` | Only if indexing or relation support proves insufficient for admin queries; no speculative schema expansion |

### 3.2 New order DTOs

| File | Purpose |
|---|---|
| `apps/api/src/orders/dto/query-orders.dto.ts` | Pagination, filters, sort |
| `apps/api/src/orders/dto/update-order-status.dto.ts` | Controlled status mutation |
| `apps/api/src/orders/dto/assign-courier.dto.ts` | Courier assignment request |

### 3.3 New couriers module

| File | Purpose |
|---|---|
| `apps/api/src/couriers/couriers.module.ts` | Module registration |
| `apps/api/src/couriers/couriers.controller.ts` | `GET /couriers` |
| `apps/api/src/couriers/couriers.service.ts` | Active courier listing and query logic |
| `apps/api/src/couriers/dto/query-couriers.dto.ts` | Optional pagination/filter support |

### 3.4 New reviews module

| File | Purpose |
|---|---|
| `apps/api/src/reviews/reviews.module.ts` | Module registration |
| `apps/api/src/reviews/reviews.controller.ts` | Pending list + moderation endpoints |
| `apps/api/src/reviews/reviews.service.ts` | Moderation business logic |
| `apps/api/src/reviews/dto/query-pending-reviews.dto.ts` | Pagination/filter support |
| `apps/api/src/reviews/dto/reject-review.dto.ts` | Required rejection reason |

### 3.5 New reports module

| File | Purpose |
|---|---|
| `apps/api/src/reports/reports.module.ts` | Module registration |
| `apps/api/src/reports/reports.controller.ts` | Dashboard/basic summary endpoints |
| `apps/api/src/reports/reports.service.ts` | Small aggregate queries |
| `apps/api/src/reports/dto/query-report-range.dto.ts` | Date range validation |

### 3.6 Backend tests to add

| File | Coverage |
|---|---|
| `apps/api/src/orders/order-status.service.spec.ts` | Existing transition coverage retained/extended |
| `apps/api/src/orders/orders.service.spec.ts` or focused integration tests | Filter behavior, admin detail access, status validation, assignment rules |
| `apps/api/src/reviews/reviews.service.spec.ts` | Pending -> approved/rejected transitions, reject reason requirement |
| `apps/api/src/reports/reports.service.spec.ts` | Basic aggregate correctness |

---

## 4. Backend API contracts to implement

### 4.1 `GET /orders`

**Access:** `orders.viewAll`

**Filters:**
- `page`, `limit`
- `search`
- `status`
- `deliveryType`
- `paymentStatus`
- `assigned`
- `startDate`, `endDate`
- `sortBy`, `sortOrder`

**Response should include enough for list rendering:**
- order id / order number
- createdAt / scheduledAt
- customer summary
- delivery type
- status
- latest payment status
- grand total
- delivery/courier summary

### 4.2 `GET /orders/:id`

**Access:**
- customer remains owner-only for customer flow
- admin/operator can access all with `orders.viewAll`

**Response should include:**
- snapshot line items
- options snapshots
- payment records
- status history
- delivery assignment info
- customer summary
- pickup store / address snapshot

### 4.3 `PATCH /orders/:id/status`

**Access:** `orders.updateStatus`

**Rules:**
- uses centralized transition validator
- writes status history
- no invalid reverse transitions
- cancellation remains explicit and auditable

### 4.4 `GET /couriers`

**Access:** `couriers.view`

**Filters:**
- optional active status
- optional search
- optional pagination

**Response should include:**
- courier id
- user name / phone
- vehicle
- courier status
- lightweight workload fields if cheaply available

### 4.5 `POST /orders/:id/assign-courier`

**Access:** `orders.assignCourier`

**Rules:**
- home-delivery only
- order must be in assignable state
- courier must exist, be active, and not soft-deleted
- create or update delivery record transactionally
- if assignment implies status movement, use centralized validator and status history

### 4.6 Review moderation

| Endpoint | Access | Rules |
|---|---|---|
| `GET /reviews/pending` | `reviews.moderate` or `reviews.view` for view-only path if needed | Paginated pending queue |
| `PATCH /reviews/:id/approve` | `reviews.moderate` | `PENDING -> APPROVED` only |
| `PATCH /reviews/:id/reject` | `reviews.moderate` | `PENDING -> REJECTED`, reason required |
| `DELETE /reviews/:id` | `reviews.delete` | Soft delete via `deletedAt` |

### 4.7 Dashboard/basic reports

**Access rules:**
- dashboard widgets permission-gated by report permission
- reports remain summary-only

Suggested payload groups:
- order queue counts
- low-stock count
- pending review count
- sales summary for date range
- top products summary

---

## 5. Admin application implementation order

1. admin auth/session guard and shell
2. permission-aware sidebar/layout
3. dashboard skeleton
4. products + categories
5. stock management
6. orders list + detail
7. courier assignment queue
8. review moderation
9. basic reports

---

## 6. Admin files to create or change

### 6.1 Existing files to change

| File | Planned change |
|---|---|
| `apps/admin/package.json` | Add Phase 4 UI/data dependencies |
| `apps/admin/app/layout.tsx` | Replace placeholder metadata/root shell setup |
| `apps/admin/app/page.tsx` | Redirect or become authenticated dashboard landing |
| `apps/admin/app/globals.css` | Expand admin design tokens/base styles |
| `apps/admin/tailwind.config.ts` | Extend theme and content paths if needed |

### 6.2 Route structure to create

```text
apps/admin/app/
├── (auth)/login/page.tsx
├── (dashboard)/layout.tsx
├── (dashboard)/page.tsx
├── (dashboard)/products/page.tsx
├── (dashboard)/products/[id]/page.tsx
├── (dashboard)/categories/page.tsx
├── (dashboard)/stock/page.tsx
├── (dashboard)/orders/page.tsx
├── (dashboard)/orders/[id]/page.tsx
├── (dashboard)/courier-assignment/page.tsx
├── (dashboard)/reviews/page.tsx
└── (dashboard)/reports/page.tsx
```

### 6.3 Shared admin infrastructure to create

```text
apps/admin/lib/
├── api/
│   ├── client.ts
│   ├── auth.ts
│   ├── orders.ts
│   ├── products.ts
│   ├── categories.ts
│   ├── stock.ts
│   ├── couriers.ts
│   ├── reviews.ts
│   └── reports.ts
├── auth/
│   ├── session.ts
│   └── guards.ts
├── permissions/
│   ├── constants.ts
│   └── can.ts
└── formatters/
    ├── money.ts
    ├── date.ts
    └── status.ts
```

### 6.4 Components to create

```text
apps/admin/components/
├── layout/
│   ├── admin-shell.tsx
│   ├── sidebar.tsx
│   ├── topbar.tsx
│   └── page-header.tsx
├── auth/
│   └── login-form.tsx
├── shared/
│   ├── data-table.tsx
│   ├── filter-bar.tsx
│   ├── permission-gate.tsx
│   ├── status-badge.tsx
│   ├── confirm-dialog.tsx
│   ├── empty-state.tsx
│   └── loading-state.tsx
├── dashboard/
│   └── metric-card.tsx
├── products/
│   ├── product-table.tsx
│   ├── product-form.tsx
│   └── product-media-manager.tsx
├── categories/
│   └── category-tree.tsx
├── stock/
│   ├── stock-table.tsx
│   ├── stock-entry-form.tsx
│   └── stock-adjustment-drawer.tsx
├── orders/
│   ├── orders-table.tsx
│   ├── order-detail.tsx
│   ├── order-status-actions.tsx
│   └── courier-assignment-panel.tsx
├── reviews/
│   ├── review-table.tsx
│   └── review-moderation-dialog.tsx
└── reports/
    └── summary-card-grid.tsx
```

### 6.5 Likely admin dependencies to add

- `@tanstack/react-query`
- `react-hook-form`
- `zod`
- `@hookform/resolvers`
- `clsx`
- icon utility package if needed

Use only what the implementation actually needs; avoid prematurely pulling in a large design system.

---

## 7. Admin API dependency map by implementation stage

| UI stage | Backend dependencies |
|---|---|
| Auth/session shell | `POST /auth/login`, `GET /users/me` |
| Dashboard skeleton | dashboard/report summary endpoints |
| Products + categories | existing products/categories/media/allergens endpoints |
| Stock management | existing stock endpoints |
| Orders list/detail | new Phase 4 order endpoints |
| Courier assignment | `GET /couriers`, `POST /orders/:id/assign-courier` |
| Reviews | new Phase 4 review endpoints |
| Reports | basic report endpoints |

---

## 8. Component architecture and page composition

### 8.1 Server/client split

**Server Components by default:**
- route layouts
- initial permission/session lookup
- page-level initial data hydration when practical

**Client Components:**
- forms
- interactive tables
- filter controls
- dialogs/drawers
- row actions
- mutation flows

### 8.2 State management

| Concern | Approach |
|---|---|
| Server state | query cache |
| Filter state | URL search params |
| Form state | `react-hook-form` + `zod` |
| Session bootstrap | server-side, minimal client context |
| UI-only state | local component state |

### 8.3 Reuse rules

- one shared table primitive, domain-specific column configs
- one permission gate utility, reused in sidebar and actions
- one API client wrapper with typed response handling
- one formatter layer for money/date/status

---

## 9. Permission handling plan

### 9.1 Backend

- All new admin endpoints use `@Permissions(...)`.
- Ownership-aware customer flows remain intact.
- `GET /orders/:id` must branch by permission/ownership rather than weaken customer restrictions.

### 9.2 Frontend

- Session bootstrap loads current role and permission list.
- Sidebar items are generated from permission metadata.
- Route guards enforce minimum permission before render.
- Buttons/actions are gated separately from route visibility.
- UI hiding never replaces backend checks.

### 9.3 Landing page behavior

- ADMIN -> dashboard
- ORDER_OPERATOR -> dashboard/orders-oriented dashboard
- PRODUCT_MANAGER -> dashboard/catalog-oriented dashboard
- unsupported roles -> denied / logout path

---

## 10. Validation plan

### 10.1 Backend validation

- DTO validation for all new query and mutation endpoints
- date range validation
- UUID validation
- order status enum validation
- courier assignment eligibility validation
- review rejection reason required
- pagination max limits

### 10.2 Frontend validation

- mirror backend constraints without inventing new business rules
- inline field errors for forms
- explicit destructive confirmations
- order status UI only shows allowed next states
- stock window errors displayed near inputs
- monetary display formatting centralized

---

## 11. Test and verification plan

### 11.1 Backend tests

- order list filters and pagination
- admin/operator order access vs customer ownership
- valid and invalid order transitions
- courier assignment eligibility and transaction behavior
- pending review approve/reject/delete flows
- summary endpoint aggregates

### 11.2 Admin UI tests

- permission-driven sidebar visibility
- auth/session guard redirects
- table filter serialization to URL
- form validation smoke tests
- action visibility by permission

### 11.3 Runtime verification

- run full lint/typecheck/test/build
- run Prisma validation/migration checks if schema changes
- verify API endpoints from Docker stack
- open admin app locally and validate:
  - login
  - sidebar differences by role
  - products/categories/stock views
  - orders queue/detail
  - courier assignment flow
  - review moderation flow
  - dashboard/report widgets

---

## 12. Proposed implementation sequence in practical batches

### Batch A — Backend operational foundation
1. orders admin endpoints
2. courier listing + assignment
3. review moderation
4. dashboard/report summaries
5. backend tests and verification

### Batch B — Admin app foundation
1. dependencies
2. auth/session shell
3. permission system
4. layout/sidebar/topbar
5. dashboard skeleton

### Batch C — Catalog operations
1. products
2. categories
3. stock

### Batch D — Order operations
1. orders list/detail
2. courier assignment queue
3. review moderation
4. basic reports

### Batch E — final hardening
1. responsive behavior
2. loading/error/empty states
3. end-to-end manual verification
4. final acceptance checks

---

## 13. Key tradeoffs and decisions

1. **Backend-first is mandatory here.** The approved admin plan depends on endpoints that do not yet exist.
2. **Orders detail needs dual access semantics.** Existing customer ownership behavior must remain, while admin/operator access is added deliberately rather than by weakening checks.
3. **Courier assignment should stay transactional.** Assignment is operationally simple but changes both delivery state and order state.
4. **Reports stay intentionally shallow.** Phase 4 needs useful summaries, not Phase 8 analytics disguised as widgets.
5. **Admin UI should prefer composition over one-off pages.** Shared table/filter/action primitives will keep later maintenance manageable.
