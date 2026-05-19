# Phase 6 Customer Web Implementation Plan

## 1. Execution principles

Phase 6 will be delivered in the approved batch order:

1. Batch A — Missing backend customer support
2. Batch B — Web auth and storefront shell
3. Batch C — Catalog experience
4. Batch D — Cart and checkout
5. Batch E — Post-purchase experience
6. Batch F — Final hardening

The implementation must preserve these constraints:
- start with backend customer support before storefront UI
- keep `apps/web` focused on browsing, ordering, checkout, tracking, and reviews
- preserve the httpOnly cookie session pattern
- keep public discovery pages SEO-friendly and server-rendered where appropriate
- backend remains authoritative for:
  - cart totals
  - stock validation
  - order creation
  - payment initiation/finalization
- do not start:
  - mobile app
  - loyalty UI
  - campaigns UI
  - notifications UI
  - maps/live tracking
  - advanced analytics

---

## 2. Backend files to create or change

### 2.1 New backend files expected

#### Addresses module

```text
apps/api/src/addresses/
├── addresses.controller.ts
├── addresses.module.ts
├── addresses.service.ts
├── addresses.service.spec.ts
└── dto/
    ├── create-address.dto.ts
    └── update-address.dto.ts
```

#### Reviews additions

```text
apps/api/src/reviews/dto/
├── create-review.dto.ts
└── query-product-reviews.dto.ts
```

### 2.2 Existing backend files expected to change

```text
apps/api/src/app.module.ts
apps/api/src/common/constants/error-codes.ts
apps/api/src/reviews/reviews.controller.ts
apps/api/src/reviews/reviews.service.ts
apps/api/src/reviews/reviews.service.spec.ts
apps/api/src/categories/categories.controller.ts        # only if category-by-slug endpoint is chosen
apps/api/src/categories/categories.service.ts           # only if category-by-slug endpoint is chosen
```

### 2.3 Backend contracts to add in Batch A

#### Address endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/addresses` | list own active addresses |
| `POST` | `/addresses` | create own address |
| `PATCH` | `/addresses/:id` | update own address |
| `DELETE` | `/addresses/:id` | soft delete own address |
| `PATCH` | `/addresses/:id/default` | set own default address |

#### Review endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/reviews` | create review for eligible own delivered order item |
| `GET` | `/reviews/product/:productId` | list approved, non-deleted reviews for public display |

#### Optional SEO convenience endpoint

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/categories/slug/:slug` | direct category lookup for SEO routes |

### 2.4 Backend validation and behavior rules

#### Addresses

- all queries owner-scoped by authenticated customer id
- soft delete via `deletedAt`
- only one default address per customer
- setting one address default must clear previous default in a transaction
- deleted addresses must never appear in checkout lists

#### Reviews

- authenticated customer only
- `rating` 1–5
- `orderItemId` must belong to current customer
- related order must be `DELIVERED`
- one review per `orderItemId`
- created review starts as `PENDING`
- product review listing exposes only:
  - `APPROVED`
  - `deletedAt: null`
- no moderation behavior expansion beyond already-existing admin flow

---

## 3. Web files to create or change

### 3.1 Root app/config files expected to change

```text
apps/web/package.json
apps/web/app/globals.css
apps/web/app/layout.tsx
apps/web/app/page.tsx
apps/web/next.config.ts                         # only if image/domain or metadata config needs adjustment
```

Expected new dependencies:
- `react-hook-form`
- `zod`
- `@hookform/resolvers`
- `vitest` if the web app receives unit tests in Phase 6

### 3.2 Route files expected to be created

```text
apps/web/app/(storefront)/page.tsx
apps/web/app/(storefront)/kategori/[slug]/page.tsx
apps/web/app/(storefront)/urun/[slug]/page.tsx

apps/web/app/(auth)/giris/page.tsx
apps/web/app/(auth)/kayit/page.tsx

apps/web/app/(customer)/layout.tsx
apps/web/app/(customer)/sepet/page.tsx
apps/web/app/(customer)/odeme/page.tsx
apps/web/app/(customer)/adresler/page.tsx
apps/web/app/(customer)/siparisler/page.tsx
apps/web/app/(customer)/siparisler/[id]/page.tsx
apps/web/app/access-denied/page.tsx
```

### 3.3 Route handlers expected to be created

```text
apps/web/app/api/auth/login/route.ts
apps/web/app/api/auth/register/route.ts
apps/web/app/api/auth/logout/route.ts
apps/web/app/api/auth/session/route.ts

apps/web/app/api/cart/[...path]/route.ts
apps/web/app/api/orders/[...path]/route.ts
apps/web/app/api/payments/[...path]/route.ts
apps/web/app/api/addresses/[...path]/route.ts
apps/web/app/api/reviews/[...path]/route.ts
```

### 3.4 Shared library files expected to be created

```text
apps/web/lib/api/client.ts
apps/web/lib/auth/session.ts
apps/web/lib/auth/guards.ts
apps/web/lib/auth/types.ts
apps/web/lib/permissions/can.ts

apps/web/lib/catalog/types.ts
apps/web/lib/catalog/queries.ts
apps/web/lib/catalog/schemas.ts

apps/web/lib/cart/types.ts
apps/web/lib/cart/queries.ts

apps/web/lib/checkout/types.ts
apps/web/lib/checkout/schemas.ts

apps/web/lib/orders/types.ts
apps/web/lib/orders/status.ts

apps/web/lib/addresses/types.ts
apps/web/lib/addresses/schemas.ts

apps/web/lib/reviews/types.ts
apps/web/lib/reviews/schemas.ts

apps/web/lib/seo/metadata.ts
apps/web/lib/seo/structured-data.ts
```

### 3.5 Component files expected to be created

```text
apps/web/components/layout/
├── storefront-shell.tsx
├── storefront-header.tsx
├── storefront-footer.tsx
└── mobile-cart-bar.tsx

apps/web/components/auth/
├── customer-login-form.tsx
└── customer-register-form.tsx

apps/web/components/home/
├── hero.tsx
├── category-strip.tsx
└── featured-products.tsx

apps/web/components/catalog/
├── breadcrumbs.tsx
├── catalog-filters.tsx
├── product-card.tsx
└── product-grid.tsx

apps/web/components/product/
├── allergen-list.tsx
├── product-gallery.tsx
├── product-options-form.tsx
└── product-reviews.tsx

apps/web/components/cart/
├── cart-line-item.tsx
├── cart-summary.tsx
└── empty-cart.tsx

apps/web/components/checkout/
├── address-selector.tsx
├── checkout-form.tsx
├── checkout-summary.tsx
├── delivery-method-step.tsx
└── pickup-store-selector.tsx

apps/web/components/account/
├── address-form.tsx
├── order-card.tsx
├── order-status-timeline.tsx
└── review-form.tsx

apps/web/components/shared/
├── async-state.tsx
├── form-field.tsx
├── price.tsx
└── status-badge.tsx
```

### 3.6 Suggested test files

```text
apps/web/lib/auth/guards.spec.ts
apps/web/lib/catalog/schemas.spec.ts
apps/web/lib/checkout/schemas.spec.ts
apps/web/lib/reviews/schemas.spec.ts
apps/web/lib/orders/status.spec.ts
```

---

## 4. Auth and session strategy

### 4.1 Required behavior

- public browsing must remain unauthenticated-friendly
- cart, checkout, addresses, order history, tracking, and review creation require a valid customer session
- only `CUSTOMER` may enter customer-only routes
- `ADMIN`, `ORDER_OPERATOR`, `PRODUCT_MANAGER`, and `COURIER` must be denied from customer account surfaces

### 4.2 Implementation approach

Use the already-proven pattern from admin/courier:
- `customer_access_token`
- `customer_refresh_token`
- httpOnly cookies
- same-site cookies
- server-side `GET /users/me` bootstrap
- route handlers proxy backend requests
- no raw access token in browser JavaScript

Recommended auth library split:

```text
session.ts
  - getCustomerSession()
  - requireCustomerSession()
  - refreshCustomerSession()
  - cookie names

guards.ts
  - requireCustomerRole()

types.ts
  - CustomerSession
  - SessionUser
```

### 4.3 Redirect rules

| Situation | Result |
|---|---|
| anonymous visits `/sepet`, `/odeme`, `/adresler`, `/siparisler` | redirect to `/giris` with return target |
| authenticated customer visits auth page | redirect to intended destination/home |
| authenticated non-customer visits customer page | redirect to `/access-denied` |
| session refresh fails | clear session and redirect to `/giris` |

---

## 5. Catalog and SEO strategy

### 5.1 Server rendering strategy

Use server components for:
- home
- category pages
- product detail pages

Use client components only for:
- filters with local interactivity
- customization forms
- add-to-cart interactions

### 5.2 SEO implementation

#### Home
- explicit `metadata`
- bakery/organization JSON-LD

#### Category
- server-resolved category by slug
- `generateMetadata`
- canonical URL
- breadcrumb JSON-LD
- clear `notFound()` for invalid/inactive category

#### Product
- server-fetched product by slug
- `generateMetadata`
- canonical URL
- Open Graph data
- `Product` JSON-LD
- only include aggregate rating when public approved review data exists

### 5.3 Data rules

- only active, non-deleted public products render
- inactive or soft-deleted products must not be purchasable
- public listing pagination must respect backend defaults/max limits
- frontend may preview availability, but backend remains final authority

---

## 6. Cart and checkout flow

### 6.1 Cart flow

```text
Product detail
  -> select options / quantity / note
  -> POST /cart/items
  -> fetch current cart
  -> show backend-authoritative cart
```

Cart rules:
- frontend previews line totals only for presentation
- cart data always refetched after mutation
- no optimistic mutation of authoritative quantities/totals
- quantity controls disable while request is in flight

### 6.2 Checkout flow

```text
GET /cart
  -> choose HOME_DELIVERY or PICKUP
  -> choose address or store
  -> optional scheduledAt / note
  -> POST /orders
  -> backend creates PAYMENT_PENDING order + reservations
  -> POST /payments/initiate
  -> provider handoff / redirect
```

### 6.3 Checkout failure handling

| Failure | UI behavior |
|---|---|
| empty cart | redirect or CTA back to catalog |
| address required / invalid | field-level guidance |
| pickup store invalid | field-level guidance |
| stock no longer available | explain and refetch cart/product state |
| payment initiation fails | preserve order context and show retry-safe message |
| session expires | redirect to login with return target |

### 6.4 Delivery fee note

Current order service does not yet calculate delivery zone fee into `deliveryFee`; Phase 6 UI should not invent totals client-side. If delivery fee is required for customer checkout acceptance, that backend gap must be resolved before or within Batch D rather than approximated in the browser.

---

## 7. Review eligibility flow

### 7.1 Eligibility contract

Review creation must be allowed only when:
- the current user owns the order item
- the parent order status is `DELIVERED`
- that order item does not already have a review

### 7.2 Recommended backend behavior

`POST /reviews`
- validates eligibility transactionally
- creates `PENDING` review
- returns the created review state

`GET /reviews/product/:productId`
- returns only approved, non-deleted reviews
- supports pagination

### 7.3 Recommended UI behavior

In order detail:
- show `Bu ürünü değerlendir` only for eligible delivered items
- if review already exists:
  - `PENDING` -> show “Onay bekliyor”
  - `APPROVED` -> show “Yorum gönderildi”
  - `REJECTED` -> show moderated state if returned by API
- do not imply instant publication

On product detail:
- show only approved reviews
- empty state should be positive and non-blocking

---

## 8. Batch-by-batch implementation plan

### Batch A — Missing backend customer support

#### Scope
- addresses module
- review creation endpoint
- public product review listing
- optional category-by-slug support if chosen

#### Backend files
- create `apps/api/src/addresses/*`
- update:
  - `apps/api/src/app.module.ts`
  - `apps/api/src/common/constants/error-codes.ts`
  - `apps/api/src/reviews/reviews.controller.ts`
  - `apps/api/src/reviews/reviews.service.ts`
  - `apps/api/src/reviews/reviews.service.spec.ts`
  - optionally categories controller/service

#### Acceptance
- customer can CRUD own addresses
- only one default address per customer
- review creation enforces delivered-own-item rule
- approved public product reviews are visible

### Batch B — Web auth and storefront shell

#### Scope
- dependencies
- login/register/session
- customer-only layout
- public storefront shell
- header/footer
- access denied flow

#### Acceptance
- public browsing remains open
- customer-only routes are guarded
- only `CUSTOMER` can enter account/checkout surfaces
- httpOnly cookie session verified

### Batch C — Catalog experience

#### Scope
- home page
- category pages
- listing filters
- product detail
- product customization
- SEO metadata and structured data

#### Acceptance
- active public products render correctly
- required options validate
- unavailable items cannot be purchased
- product/category pages are server-rendered and SEO-complete

### Batch D — Cart and checkout

#### Scope
- cart page
- cart mutation controls
- address selection
- pickup store selection
- checkout form
- order creation
- payment initiation handoff

#### Acceptance
- browsing-to-order path works
- backend totals remain authoritative
- no client-side stock or total trust
- invalid checkout states fail safely

### Batch E — Post-purchase experience

#### Scope
- order history
- order tracking
- active-order polling
- status timeline
- delivered-product review creation

#### Acceptance
- customer sees only own orders
- tracking reflects backend state
- review CTA appears only when eligible

### Batch F — Final hardening

#### Scope
- UX consistency
- responsive checks
- loading/empty/error/stale states
- SEO audit
- Docker runtime verification
- quality gates

#### Acceptance
- Phase 6 is complete without starting later phases

---

## 9. Testing and runtime verification plan

### 9.1 Per-batch quality gates

After every batch:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

If Prisma/schema remains unchanged, no migration is required; if category/address/review work requires schema changes unexpectedly, stop and document before applying them.

### 9.2 Backend verification

#### Batch A
- address CRUD owner-scope tests
- default-address transaction behavior
- review create eligibility tests
- duplicate review rejection
- public approved review query filters

#### Existing commerce regression
- cart totals still server-authoritative
- order creation still recalculates prices
- stock reservation behavior unchanged

### 9.3 Frontend verification

- auth route guards
- auth forms
- customization schema validation
- checkout schema validation
- review form validation
- status label mapping

### 9.4 Browser/runtime verification

Use Docker runtime plus browser verification for:
1. public home/category/product render
2. customer login/register/session/logout
3. customization -> cart flow
4. cart -> checkout flow
5. address create/select flow
6. order creation/payment initiation path
7. order history/tracking
8. delivered-item review flow
9. mobile/tablet/desktop responsive checks
10. metadata/structured data presence on public pages

### 9.5 Error-path verification

- anonymous checkout redirect
- non-customer route denial
- empty cart
- stale stock
- invalid required options
- invalid address mode
- duplicate review submission
- inaccessible foreign order id

---

## 10. Known implementation cautions

1. **Address flow is a real dependency, not decorative UI.** Checkout should not be implemented around temporary fake address data.
2. **Do not trust UI totals.** Server values must remain the source of truth even if the UI previews totals for clarity.
3. **Do not begin with visual polish before auth/backend contracts.** The phase is a commerce system, not a landing-page exercise.
4. **Review visibility and review creation are different concerns.** Public product pages see only approved reviews; customers can create pending reviews from delivered orders.
5. **Delivery fee calculation needs explicit backend ownership.** If product acceptance requires visible delivery fees, resolve it server-side before presenting final totals.
6. **Public SEO pages should not be unnecessarily client-heavy.** Keep discovery server-rendered and move only interactions to client components.

---

## 11. Stop condition before coding

Implementation should begin only after approval of:
- backend support scope
- planned file set
- batch order
- checkout ownership boundaries
- review eligibility rules
- SEO strategy

Once approved, start with **Batch A only** and stop after its verification report.
