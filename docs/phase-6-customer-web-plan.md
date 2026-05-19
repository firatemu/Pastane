# Phase 6 Customer Web Planning Document

## 1. Scope and product intent

Phase 6 is the customer-facing commerce phase in `apps/web`.

Included:
- customer storefront
- home page
- category pages
- product listing
- product detail
- product customization
- cart
- checkout
- address management
- order tracking
- order history
- review creation for delivered products
- customer authentication and session flow
- responsive, polished bakery/pastry presentation

Explicitly excluded:
- mobile app
- full loyalty UI
- campaigns UI
- notifications UI
- advanced analytics
- map/live tracking
- admin or courier workflows

The product goal is not merely to expose backend features. The web app should behave like a credible bakery storefront:
1. make products desirable quickly,
2. reduce friction from discovery to checkout,
3. keep customization understandable,
4. make post-purchase status clear,
5. invite reviews only when the customer is eligible.

---

## 2. Current backend readiness review

### 2.1 Already available

The backend currently supports:

| Domain | Available contracts |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /users/me` |
| Categories | `GET /categories`, `GET /categories/:id` |
| Products | `GET /products`, `GET /products/slug/:slug`, `GET /products/:id` |
| Stores | `GET /stores`, `GET /stores/:id` |
| Delivery zones | `GET /delivery-zones` |
| Cart | `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:id`, `DELETE /cart/items/:id`, `DELETE /cart` |
| Orders | `POST /orders`, `GET /orders/my`, `GET /orders/:id`, `POST /orders/:id/cancel` |
| Payments | `POST /payments/initiate`, `GET /payments/:orderId` |

The data model already contains:
- addresses
- order snapshots
- order status history
- product images
- product option groups/options
- allergens
- stock windows
- reviews

### 2.2 Backend gaps that block a complete Phase 6 experience

| Missing or incomplete area | Why it matters |
|---|---|
| No customer `addresses` module/endpoints yet | Checkout cannot support reusable saved addresses |
| No customer review creation endpoint | Delivered-order review UI has no target API |
| No public product review listing endpoint | Product detail cannot show approved reviews |
| No customer profile update endpoints | Profile editing is out of scope for core checkout, but account area would remain thin |
| No category-by-slug endpoint | SEO-friendly category URLs need either slug lookup support or server-side resolution from category tree |
| No dedicated public featured/home endpoint | Home page can still be composed from existing product/category APIs, but merchandising is less intentional |

### 2.3 Recommended minimum backend support for Phase 6

Required before or during implementation:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/addresses` | list current customer addresses |
| `POST` | `/addresses` | create address |
| `PATCH` | `/addresses/:id` | update own address |
| `DELETE` | `/addresses/:id` | soft delete own address |
| `PATCH` | `/addresses/:id/default` | set default address |
| `POST` | `/reviews` | create review for delivered own order item |
| `GET` | `/reviews/product/:productId` | list approved public reviews |

Recommended but not mandatory if resolved another way:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/categories/slug/:slug` | direct SEO-safe category resolution |

Phase boundary note:
- loyalty may remain read-only or absent in Phase 6
- campaigns and notifications must remain unimplemented here

---

## 3. Customer auth and session strategy

### 3.1 Role rule

Only `CUSTOMER` accounts may enter authenticated customer flows:
- cart mutations
- checkout
- addresses
- order history
- order tracking
- review creation

Public visitors may browse:
- home
- categories
- product listing
- product detail

### 3.2 Session model

Use the same security posture already proven in `apps/admin` and `apps/courier`:
- httpOnly cookies for access and refresh tokens
- route handlers in `apps/web/app/api/...` proxying to backend
- no access token exposed to client-side JavaScript
- server-side session bootstrap using `GET /users/me`
- refresh flow handled through server routes

### 3.3 Recommended route guarding

Public route groups:
- `/`
- `/kategori/[slug]`
- `/urun/[slug]`
- `/giris`
- `/kayit`

Authenticated customer route groups:
- `/sepet`
- `/odeme`
- `/adresler`
- `/siparisler`
- `/siparisler/[id]`

Behavior:
- unauthenticated user clicking checkout is redirected to login with return URL
- non-customer authenticated roles are denied from customer account surfaces
- customer session remains optional for browsing, required for purchase flow

---

## 4. Information architecture and route structure

```text
apps/web/app/
├── (storefront)/
│   ├── page.tsx
│   ├── kategori/
│   │   └── [slug]/
│   │       └── page.tsx
│   └── urun/
│       └── [slug]/
│           └── page.tsx
├── (auth)/
│   ├── giris/
│   │   └── page.tsx
│   └── kayit/
│       └── page.tsx
└── (customer)/
    ├── layout.tsx
    ├── sepet/
    │   └── page.tsx
    ├── odeme/
    │   └── page.tsx
    ├── adresler/
    │   └── page.tsx
    └── siparisler/
        ├── page.tsx
        └── [id]/
            └── page.tsx
```

Recommended future-safe optional routes:
- `/ara`
- `/hesabim`

Do not add loyalty, campaign, notification, or map routes in this phase.

---

## 5. Page definitions

### 5.1 Home page `/`

| Item | Definition |
|---|---|
| Purpose | brand introduction, product discovery, conversion entry |
| Audience | public |
| API dependencies | `GET /categories`, `GET /products` |
| Sections | hero, featured categories, seasonal bakery highlights, popular products, pickup/delivery reassurance |
| Actions | browse category, open product, add product if simple/no required customization |
| Filters | none |
| Loading/empty/error | hero skeleton, category fallback, curated empty state |
| SEO | unique title, description, Organization/Bakery structured data |

### 5.2 Category page `/kategori/[slug]`

| Item | Definition |
|---|---|
| Purpose | browse products within a bakery category |
| Audience | public |
| API dependencies | `GET /categories`, `GET /products?categoryId=...` |
| Actions | filter, sort, open product |
| Filters | search, price range if useful, sort by newest/name/price |
| Validation | slug must resolve to active category |
| Loading/empty/error | product grid skeleton, category empty state, 404 for unknown slug |
| SEO | category metadata, canonical URL, breadcrumb structured data |

### 5.3 Product detail `/urun/[slug]`

| Item | Definition |
|---|---|
| Purpose | persuade and configure purchase |
| Audience | public |
| API dependencies | `GET /products/slug/:slug`, later `GET /reviews/product/:productId` |
| Content | gallery, price, short/long description, allergens, preparation time, availability, option groups, quantity, note |
| Actions | customize, add to cart |
| Validation | required option groups, single/multiple selection rules, quantity minimum 1 |
| Status handling | inactive/unavailable products must not be purchasable |
| SEO | product title, description, canonical, Open Graph, Product structured data |

### 5.4 Cart `/sepet`

| Item | Definition |
|---|---|
| Purpose | review chosen items before checkout |
| Audience | authenticated customer |
| API dependencies | `GET /cart`, `PATCH /cart/items/:id`, `DELETE /cart/items/:id`, `DELETE /cart` |
| Actions | change quantity, change note/options if supported through edit flow, remove, clear, continue shopping, proceed to checkout |
| Validation | quantity min 1; totals are display-only and backend remains authoritative |
| Empty state | persuasive empty cart with CTA back to products |
| Pricing | always render backend-returned item totals/current cart state |

### 5.5 Checkout `/odeme`

| Item | Definition |
|---|---|
| Purpose | turn cart into `PAYMENT_PENDING` order and start payment |
| Audience | authenticated customer |
| API dependencies | `GET /cart`, `GET /addresses`, `GET /stores`, `GET /delivery-zones`, `POST /orders`, `POST /payments/initiate` |
| Sections | delivery method, address or pickup store, scheduling, order note, summary, payment step |
| Validation | home delivery requires address; pickup requires store; unavailable cart/items block checkout |
| Flow | cart -> create order -> initiate payment -> redirect/hand off to provider |
| Error handling | stock unavailable, expired session, address invalid, payment initiate failure |

### 5.6 Address management `/adresler`

| Item | Definition |
|---|---|
| Purpose | create and maintain reusable delivery addresses |
| Audience | authenticated customer |
| API dependencies | address endpoints to be added |
| Actions | add, edit, delete, set default |
| Validation | title, city, district, full address required |
| UX | lightweight forms, default badge, checkout-friendly return path |

### 5.7 Order history `/siparisler`

| Item | Definition |
|---|---|
| Purpose | show customer purchases and lead into tracking/review flows |
| Audience | authenticated customer |
| API dependencies | `GET /orders/my` |
| Actions | open detail, possibly reorder later but not in Phase 6 |
| Filters | simple status pills optional; avoid advanced analytics |
| Empty state | no orders yet, CTA to browse products |

### 5.8 Order tracking `/siparisler/[id]`

| Item | Definition |
|---|---|
| Purpose | reassure after purchase and show operational progress |
| Audience | order owner |
| API dependencies | `GET /orders/:id`, `GET /payments/:orderId` if payment state needed |
| Content | order number, current status, timeline, items, delivery/pickup info, payment summary |
| Actions | cancel only when backend allows; review delivered items when eligible |
| Polling | recommended every 20–30 seconds for active orders |
| Validation | ownership enforced by backend |

### 5.9 Review creation

| Item | Definition |
|---|---|
| Purpose | collect review only after fulfilled purchase |
| Audience | authenticated customer |
| API dependencies | `POST /reviews` to be added |
| Entry point | delivered order detail, per eligible order item |
| Fields | rating 1–5, optional comment |
| Validation | own order item, delivered order, one review per order item |
| UX | inline card or modal attached to delivered item |
| Publication | pending moderation; do not imply immediate public visibility |

---

## 6. Product customization UX

### 6.1 Principles

- required options must be obvious before add-to-cart
- multi-select and single-select groups must be visually distinct
- price modifiers should update the displayed item subtotal in real time
- custom note must feel intentional, especially for cake text
- the customer should never need to infer whether selection is complete

### 6.2 Recommended interaction model

| Group type | UI |
|---|---|
| required single-select | radio card group |
| optional single-select | radio cards with “seçme” possibility if allowed |
| optional multi-select | checkbox cards |
| note | textarea with helpful examples |

Display:
- base price
- selected modifiers
- quantity
- calculated display total

Backend truth rule:
- frontend total is a preview only
- order total is recalculated server-side from current product and option data

---

## 7. Cart and checkout UX

### 7.1 Cart

Cart should answer three questions immediately:
1. what am I buying?
2. what did I customize?
3. how do I continue?

Each line item should show:
- product image
- product name
- selected options
- custom note
- quantity controls
- unit price and line subtotal

### 7.2 Checkout

Checkout should be a guided two-mode flow:

```text
1. Teslimat seçimi
   - Adrese teslim
   - Gel-al

2. Gerekli bilgiler
   - adres veya mağaza
   - planlanan zaman
   - not

3. Sipariş özeti
4. Ödeme başlat
```

Important rules:
- no payment form implementation beyond current provider flow assumptions
- do not permanently deduct stock before payment success
- if order creation succeeds but payment initiation fails, surface recoverable state clearly

---

## 8. Address flow

### Recommended checkout behavior

```text
No saved address
  -> create address inline or on dedicated page

Saved addresses exist
  -> select one
  -> optionally add new
  -> default address preselected
```

Recommended fields:
- title
- city
- district
- neighborhood
- full address
- building
- floor
- apartment
- directions
- isDefault

Operational note:
- address snapshot belongs on the order, so later edits must not alter history

---

## 9. Order tracking and review flow

### 9.1 Tracking

Tracking should map backend statuses into customer-friendly language:

| Backend | Customer label |
|---|---|
| `PAYMENT_PENDING` | Ödeme bekleniyor |
| `CONFIRMED` | Sipariş alındı |
| `PREPARING` | Hazırlanıyor |
| `READY` | Hazır |
| `ASSIGNED_TO_COURIER` | Kuryeye verildi |
| `OUT_FOR_DELIVERY` | Yolda |
| `DELIVERED` | Teslim edildi |
| `CANCELLED` | İptal edildi |

The page should include:
- current status hero
- chronological timeline
- pickup/delivery mode
- order summary
- only valid actions

### 9.2 Reviews

Eligibility:
- order must be `DELIVERED`
- order item must belong to current customer
- item must not already have a review

Recommended UX:
- after delivery, show “Bu ürünü değerlendir” CTA per eligible item
- explain that reviews are moderated
- after submit, replace form with “Onay bekliyor”

---

## 10. Visual design direction

### 10.1 Brand mood

The storefront should feel:
- warm
- artisanal
- fresh
- indulgent
- trustworthy

### 10.2 Palette and material language

Recommended direction:
- cream / warm ivory backgrounds
- cocoa / espresso text
- amber / caramel accents
- soft berry or pistachio secondary accents in moderation
- rounded cards, generous whitespace, soft shadows

### 10.3 Imagery

- product photography leads the page
- avoid admin-like density
- use large hero media
- preserve appetite appeal on mobile

### 10.4 UI priorities

Customer-facing priority order:
1. product desirability
2. clarity of price and availability
3. ease of customization
4. checkout confidence
5. operational reassurance after purchase

---

## 11. Responsive and mobile-first behavior

### 11.1 Layout behavior

| Viewport | Behavior |
|---|---|
| Mobile | single-column, sticky cart/checkout CTAs, bottom-safe spacing |
| Tablet | two-column product grids, wider detail layouts |
| Desktop | editorial storefront with wider grids and split product detail |

### 11.2 Mobile-specific rules

- sticky add-to-cart bar on product detail
- large tap targets
- filters collapse into drawers/sheets
- checkout summary remains visible without crowding forms
- avoid hover-only interactions

---

## 12. Loading, empty, error, and stale states

| Surface | Loading | Empty | Error |
|---|---|---|---|
| Home | section skeletons | fallback merchandising cards | partial-section retry |
| Category | product card skeletons | no products in category | invalid slug / fetch error |
| Product detail | gallery/content skeleton | n/a | not found / unavailable |
| Cart | cart skeleton | empty cart CTA | failed mutation |
| Checkout | section skeletons | empty cart redirect | address/payment/stock errors |
| Addresses | form/list skeleton | no saved addresses | mutation errors |
| Orders | order cards skeleton | no orders yet | fetch error |
| Tracking | status/timeline skeleton | n/a | not found / forbidden |
| Reviews | inline loading | no approved reviews | submit/list errors |

Stale-state rules:
- active order pages may poll
- cart mutations refetch authoritative state
- checkout must handle server-side stock changes without pretending success

---

## 13. SEO strategy

### 13.1 Static/meta strategy

Use Next.js App Router metadata APIs for:
- home page
- category pages
- product pages

### 13.2 Product pages

Include:
- title
- meta description
- canonical URL
- Open Graph image/title/description
- `Product` structured data where available:
  - name
  - image
  - description
  - offer price
  - availability
  - aggregate rating only when public reviews exist

### 13.3 Category pages

Include:
- category-specific title/description
- canonical URL
- breadcrumb structured data

### 13.4 Technical SEO rules

- server-render public discovery pages
- avoid indexing auth/cart/checkout/account pages
- use semantic headings
- preserve slug stability
- ensure product/category 404 behavior is explicit

---

## 14. Recommended component architecture

```text
apps/web/
├── components/
│   ├── layout/
│   │   ├── storefront-shell.tsx
│   │   ├── storefront-header.tsx
│   │   ├── storefront-footer.tsx
│   │   └── mobile-cart-bar.tsx
│   ├── home/
│   │   ├── hero.tsx
│   │   ├── category-strip.tsx
│   │   └── featured-products.tsx
│   ├── catalog/
│   │   ├── product-card.tsx
│   │   ├── product-grid.tsx
│   │   ├── catalog-filters.tsx
│   │   └── breadcrumbs.tsx
│   ├── product/
│   │   ├── product-gallery.tsx
│   │   ├── product-options-form.tsx
│   │   ├── allergen-list.tsx
│   │   └── product-reviews.tsx
│   ├── cart/
│   │   ├── cart-line-item.tsx
│   │   ├── cart-summary.tsx
│   │   └── empty-cart.tsx
│   ├── checkout/
│   │   ├── delivery-method-step.tsx
│   │   ├── address-selector.tsx
│   │   ├── pickup-store-selector.tsx
│   │   └── checkout-summary.tsx
│   ├── account/
│   │   ├── address-form.tsx
│   │   ├── order-card.tsx
│   │   ├── order-status-timeline.tsx
│   │   └── review-form.tsx
│   └── shared/
│       ├── async-state.tsx
│       ├── price.tsx
│       ├── status-badge.tsx
│       └── form-field.tsx
├── lib/
│   ├── api/
│   ├── auth/
│   ├── catalog/
│   ├── cart/
│   ├── checkout/
│   ├── orders/
│   ├── reviews/
│   └── seo/
```

### State management recommendation

| State type | Strategy |
|---|---|
| public catalog | server components + cached/revalidated fetches |
| session | server-derived session + minimal client context |
| cart | server-authoritative state with client mutation hooks |
| checkout forms | React Hook Form + Zod |
| customization form | React Hook Form + Zod |
| transient UI | local component state |

### Server/client component strategy

Prefer server components for:
- home
- category pages
- product pages
- initial order/account shells where practical

Use client components for:
- auth forms
- option selection
- cart quantity controls
- checkout forms
- address forms
- review forms
- polling widgets

---

## 15. Testing plan

### 15.1 Backend verification needed before UI acceptance

- address ownership CRUD
- review creation eligibility
- public approved review listing
- order ownership rules
- checkout server recalculation
- cancel action only in valid states

### 15.2 Frontend tests

- auth/session guard behavior
- category slug resolution
- product customization validation
- cart mutation states
- checkout mode validation
- address create/edit/default flow
- order status rendering
- review eligibility and validation

### 15.3 E2E priorities

1. browse category -> product -> customize -> cart
2. register/login -> add address -> checkout
3. create order -> initiate payment placeholder path
4. inspect order history -> tracking page
5. delivered order item -> create review
6. unavailable product / stale stock / empty cart error cases

### 15.4 Runtime verification

- Docker `web` app starts
- public pages render
- customer login/session works
- httpOnly cookie behavior works
- SEO metadata renders server-side
- checkout and order flows work against live API
- responsive checks on mobile/tablet/desktop widths

### 15.5 Required quality gates

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Docker runtime verification
- browser verification of core storefront flow

---

## 16. Recommended implementation batches

### Batch A — Missing backend customer support

Scope:
- addresses module
- review creation
- public approved product review listing
- optional category-by-slug endpoint if preferred

Acceptance:
- customer can manage own addresses
- customer can review only eligible delivered own items
- public product detail can render approved reviews

### Batch B — Web auth and storefront shell

Scope:
- web dependencies
- customer login/register/session
- public storefront layout
- header/footer
- route guards

Acceptance:
- public browsing works
- customer-only surfaces are protected
- non-customer roles are denied from customer account flows

### Batch C — Catalog experience

Scope:
- home page
- category pages
- product listing
- product detail
- product customization
- SEO metadata

Acceptance:
- customer can discover and inspect active products
- required options validate
- unavailable items cannot be purchased

### Batch D — Cart and checkout

Scope:
- cart UI
- address integration
- delivery vs pickup checkout
- order creation
- payment initiation handoff

Acceptance:
- complete order creation path works
- backend totals remain authoritative
- invalid checkout states fail safely

### Batch E — Post-purchase experience

Scope:
- order history
- order tracking
- customer-facing status timeline
- review creation for delivered products

Acceptance:
- customer can track own orders
- delivered items expose review creation only when eligible

### Batch F — Final hardening

Scope:
- UX polish
- loading/empty/error/stale states
- responsive QA
- SEO QA
- runtime verification

Acceptance:
- Phase 6 satisfies customer storefront scope without starting Phase 7 or 8 work

---

## 17. Recommended implementation order

1. backend address and review support
2. customer auth/session shell
3. public storefront shell
4. home and category browsing
5. product detail/customization
6. cart
7. checkout/address flow
8. order history/tracking
9. review creation
10. final hardening

---

## 18. Final recommendation

Do **not** begin with homepage visuals first.

The best implementation path is:
1. close the missing backend customer contracts,
2. establish secure customer session handling,
3. then build the storefront from catalog outward into checkout and post-purchase flows.

That order keeps Phase 6 commercially coherent and prevents attractive but disconnected UI from getting ahead of the actual purchase journey.
