# AI Handoff Context

This document is the primary onboarding context for future Cursor/GPT/Composer agents working on the Pastane Platform. Read this file before making architectural, backend, frontend, mobile, Docker, or deployment changes.

## 1. Project Purpose

Pastane Platform is a single-tenant bakery/pastry ecommerce and operations platform.

The product supports:

- Customer-facing ecommerce storefront
- Admin operations panel
- Courier operations panel
- Backend API for all clients
- Product catalog and bakery-specific stock windows
- Cart, checkout, payment initiation, order tracking
- Courier delivery execution
- Review moderation
- Loyalty, notifications, campaigns, settings, audit backend foundations
- Production-oriented Docker deployment preparation

This is not a SaaS/multi-tenant product. Do not introduce tenant abstractions unless explicitly approved in a future phase.

## 2. Business Scope

Bakery/pastry business context includes:

- Cakes, pastries, bread, desserts, beverages, and bakery products
- Product categories, allergens, images, option groups, and customization options
- Daily/hourly stock windows using Europe/Istanbul assumptions
- Pickup and home delivery flows
- Courier assignment and delivery status execution
- Customer order history, tracking, and delivered-product reviews
- Loyalty points and QR-based customer identification backend
- Operational admin workflows for catalog, stock, orders, couriers, reviews, reports

## 3. Accepted Architecture Decisions

Accepted standards:

- Monorepo: Turborepo
- Package manager: pnpm
- Runtime baseline: Node.js 22 LTS
- Backend: NestJS 11 + TypeScript
- Frontend surfaces: Next.js 15 App Router
- Mobile: React Native + Expo
- Database: PostgreSQL 17 (Supabase self-host in production; Supabase CLI locally)
- ORM: Prisma
- Queue/cache: Redis 7 + BullMQ
- Object storage: MinIO
- Payments: Iyzico sandbox/provider structure
- Push notifications: FCM provider structure, placeholder until credentials are configured
- SMS: provider placeholder, OTP disabled by default
- Deployment target: Docker Compose on Ubuntu 24.04 LTS

Critical mobile decision:

- React Native + Expo is the official mobile stack.
- Flutter must not be used or reintroduced in active architecture, roadmap, planning, setup, or implementation docs.

## 4. Current Completion Status

Accepted and closed:

- Phase 0 — Monorepo and infrastructure setup
- Phase 1 — Backend core
- Phase 2 — Catalog, media, stock, stores, delivery zones
- Phase 3 — Cart, orders, payment, stock reservation
- Phase 4 — Admin panel
- Phase 5 — Courier panel
- Phase 6 — Customer web storefront and commerce flow
- Backend Completion Review and Final Backend Implementation
- **Supabase self-host on VPS** (Studio at https://studio.azem.cloud, PG 17) — see [`docs/OPERATIONS.md`](OPERATIONS.md)

Current recommended next task:

- Mobile implementation (only when explicitly requested) or feature work per product backlog

Do not start mobile implementation unless explicitly requested.

## 5. Backend Completion Status

Backend is complete for the currently approved project scope.

Completed backend domains:

- Auth, users, roles, permissions
- Refresh token/session foundation
- OTP infrastructure, disabled by default
- Categories, products, allergens
- Product images/media upload via API to MinIO
- **Homepage banners CMS:** `Banner` model (scheduled `startsAt`/`endsAt`, soft delete, `sortOrder`); public **`GET /api/v1/banners/home`** (`@Public()`); admin CRUD and **`PATCH /api/v1/banners/reorder`** (transactional); banner media upload **`POST /api/v1/banners/upload`** (image signatures + MP4/WebM video, size limits; MinIO bucket `MINIO_BUCKET_BANNERS`, default `banners`); permissions `banners.view|create|update|delete|reorder` (**seed:** ADMIN, ORDER_OPERATOR, and PRODUCT_MANAGER **all** receive `banners.*`; re-login after seed so JWT includes new codes); audit on mutations
- Product option groups/options
- Daily/hourly stock entries and movements
- Stores and delivery zones
- Cart and checkout backend
- Orders and order status history
- Stock reservations and timeout jobs
- Payments, Iyzico provider structure, callback handling
- Payment idempotency and duplicate callback safety
- Courier listing/assignment, delivery execution, **admin courier account management** (create/update profile & credentials, soft-deactivate/reactivate, audit hooks)
- Reviews creation/moderation
- Addresses
- Reports/dashboard operational summaries
- Loyalty accounts, QR, movements, earn/redeem backend
- Notifications model, BullMQ queue, FCM/SMS/email provider placeholders
- Campaigns backend, intentionally shallow
- Settings backend
- Audit logging backend
- Health checks for PostgreSQL, Redis, MinIO

Known intentional backend limitations:

- No real FCM/SMS/email credentials or live provider delivery yet
- No advanced promotion engine
- No refunds
- No live tracking/maps
- No advanced analytics

## 6. Frontend Completion Status

### Admin Panel

Completed for Phase 4 **plus pre-VPS coverage pass**:

- Admin auth/session shell
- Permission-aware sidebar/layout (**OR** semantics on nav items; route-level `requirePermission`)
- Dashboard
- Catalog operations: categories, allergens, products, images, options
- **Content management:** **Homepage banners** (`/banners`, sidebar group *İçerik yönetimi*): list/thumbnail/schedule/reorder, create–edit with desktop+mobile uploads via catalog proxy to API, permission-gated
- **Campaigns** (`/campaigns`): list, create, edit, soft-delete — `campaigns.*`
- **Loyalty admin** (`/loyalty`): settings history + new row, manual point adjust — `loyalty.manageSettings`
- Stores, delivery zones, stock management
- **System settings** (`/settings`): full key list read-only display; system flags + optional raw JSON key patch — `settings.view` / `settings.update`
- **Notifications** (`/notifications`): operator send — `notifications.send`
- **Audit** (`/audit`): last 200 rows — `audit.view`
- **Roles / permissions (read-only)** (`/roles`, `/permissions`) — `roles.view`, `permissions.view`; system nav
- Orders list/detail/status actions
- Courier assignment (operators) and **courier management** (`/couriers`): create/edit accounts, phone/email/password, vehicle, soft deactivate/reactivate; UI actions gated by `couriers.create` / `couriers.update`
- Review moderation
- Reports: sales summary + top products (**correct `data.topProducts` mapping**); optional `startDate`/`endDate` query params
- **Admin API URL:** `getAdminApiBaseUrl()` mirrors storefront Docker/host behavior (`ADMIN_API_URL`, `/.dockerenv`, `RUNNING_IN_DOCKER`)

### Courier Panel

Completed (core + Phase 4 alignment; 2026-05 operational enrichment):

- Courier-only login/session guard; **valid JWT but non-COURIER role** → [`/access-denied`](../apps/courier/app/access-denied/page.tsx) (no silent treatment as logged-out).
- Mobile-first shell
- Assigned deliveries list + **list cards**: order status label, scheduled time, full address (incl. directions), **failedReason** when FAILED; **gruplar** (aktif / bugün tamamlanan / bugün başarısız / önceki); **özet sayılar**; liste API: sipariş **oluşturulma**, **teslimat tipi**, **ürün kalemi sayısı**, **genel toplam**, son **ödeme durumu** rozeti (kart/provider yok)
- Polling (15s) + **last successful refresh time** + **non-blocking poll failure warning** while keeping last good data
- Delivery detail: **pickup/delivery timestamps**, **yolda süre tahmini**, sipariş/sipariş kaydı zamanları, **tutar özeti** (ara toplam, ücretler, sadakat, genel toplam), **ödeme rozeti**, sipariş **oluşturulma**, order status, notes, line **customNote**, **birim / satır tutarı (anlık görüntü)**, option list + **opsiyon fiyat farkı**, **statusHistory**, **failedReason**, **tel:** ile arama
- Pick up, deliver, fail-with-reason flows; **no optimistic updates**; **401** → redirect to login on client API calls
- **API errors**: Turkish messages keyed off `error.code` where helpful (`DELIVERY_NOT_FOUND`, transition invalid, etc.)
- **Courier API base URL:** `getCourierApiBaseUrl()` mirrors admin/web Docker-vs-host behavior; dev Compose sets `RUNNING_IN_DOCKER=1` on the `courier` service
- **Backend (`GET /deliveries/my`)** genişletildi: `order.createdAt`, `deliveryType`, `grandTotal`, `_count.items`, son `payments.status` — detay sorgusuna `payments` özeti eklendi
### Customer Web

Completed for Phase 6:

- Customer auth/register/login/logout/session
- Public storefront shell
- **Home:** dynamic hero from **`GET /api/v1/banners/home`** (carousel/fade when multiple banners; static fallback when none); MinIO URLs for image/video (muted autoplay for video)
- Home, category, product listing/detail
- SEO metadata and structured data
- Product customization validation
- Cart and checkout
- Backend-authoritative totals
- Payment pending flow
- Order history and tracking
- Delivered item review creation

## 7. Monorepo Structure

Expected structure:

```text
apps/
  api/        NestJS backend API
  web/        Customer web storefront
  admin/      Admin operations panel
  courier/    Courier operations panel
  mobile/     Reserved for React Native + Expo mobile app
packages/
  database/   Prisma schema, migrations, seed
  types/      Shared types
  ui/         Shared UI package
  config/     Shared configuration helpers
  constants/  Shared constants
docker/
  docker-compose.dev.yml
  docker-compose.prod.yml
  nginx/
  postgres/
  scripts/
docs/
.cursor/rules/
```

Do not collapse admin/courier into customer web routes. They are separate Next.js apps.

## 8. Docker Architecture

Development Docker stack includes:

- PostgreSQL
- Redis
- MinIO
- API
- Web
- Admin
- Courier

Production deployment is intended for Ubuntu 24.04 LTS with Docker Compose and Nginx reverse proxy.

Production security expectations:

- PostgreSQL must not be publicly exposed
- Redis must not be publicly exposed
- MinIO console must not be publicly exposed
- Public ingress should go through Nginx
- Secrets must come from environment variables, never source code

## 9. Authentication and Session Strategy

Backend:

- JWT access tokens
- Hashed refresh tokens
- Role and permission claims
- Global JWT guard with public route decorator support
- Permission guard remains backend-authoritative

Web/Admin/Courier apps:

- httpOnly cookie session strategy
- Access tokens must not be exposed to client-side JavaScript
- Route guards enforce surface-specific role access

Surface access rules:

- Admin app: ADMIN, ORDER_OPERATOR, PRODUCT_MANAGER only
- Courier app: COURIER only
- Customer web protected routes: CUSTOMER only
- Public storefront browsing remains open

## 10. RBAC and Permission Model

Roles:

- ADMIN
- ORDER_OPERATOR
- PRODUCT_MANAGER
- COURIER
- CUSTOMER

Permissions are seeded idempotently and attached through role-permission relations.

Backend permission checks are authoritative. Frontend permission visibility is convenience only and must never replace backend checks.

Future agents must not bypass guards, hardcode roles into business logic where permissions are required, or trust client-side visibility rules.

## 11. Order, Payment, and Stock Reservation Architecture

Critical order/payment flow:

```text
cart
→ order PAYMENT_PENDING
→ stock reservation
→ payment initiate
→ payment success callback
→ final stock deduction
→ order CONFIRMED
```

Hard rules:

- Do not permanently deduct stock before payment success.
- Stock is reserved during payment pending state.
- Reservation must still be ACTIVE and not expired before payment finalization.
- Order must still be PAYMENT_PENDING before final confirmation.
- Duplicate callbacks must not double-finalize orders.
- Payment callback payloads must be sanitized; never log raw card data.
- Order items store immutable product/option snapshots.
- Order totals are recalculated server-side.

## 12. Backend-Authoritative Business Rules

The backend is authoritative for:

- Cart contents and totals
- Product prices
- Option prices
- Delivery fees
- Stock availability
- Stock reservation and final deduction
- Loyalty point balances
- Loyalty redemption value
- Campaign/discount applicability
- Order status transitions
- Payment status
- Review eligibility

Frontend must never calculate authoritative totals or trust client-submitted totals.

## 13. Polling and Optimistic Update Policy

Accepted polling decisions:

- Admin order/dashboard flows use polling, not WebSockets
- Courier deliveries use polling
- Customer active order tracking uses polling

Critical no-optimistic-update policy:

- No optimistic updates for order status changes
- No optimistic updates for courier assignment
- No optimistic updates for delivery execution
- No optimistic checkout/payment behavior
- After critical mutations, refetch authoritative backend state

## 14. Production Deployment Status

**Live production (azem.cloud):**

- API: https://api.azem.cloud
- Supabase Studio: https://studio.azem.cloud
- Deploy: `pnpm push:vps` from `main` → VPS `./deploy.sh`
- Data sync local → VPS: `scripts/sync-local-to-vps.sh`

**Canonical docs:** see [`docs/README.md`](README.md).

**Key references:**

- [docs/OPERATIONS.md](OPERATIONS.md) — day-to-day ops
- [docs/azem-cloud-vps-deployment.md](azem-cloud-vps-deployment.md) — VPS runbook
- [docs/backup-and-restore.md](backup-and-restore.md) — backup/restore
- [docs/ROLLBACK_GUIDE.md](ROLLBACK_GUIDE.md) — app image rollback
- [docs/nginx-production-example.md](nginx-production-example.md) — reverse proxy patterns
- [docs/monitoring-and-observability.md](monitoring-and-observability.md) — health and logs
- [docs/adr-polling-strategy.md](adr-polling-strategy.md) — polling vs WebSocket decision
- [.env.production.example](../.env.production.example) — production env template (never commit secrets)
- [docker/docker-compose.prod.yml](../docker/docker-compose.prod.yml) — app stack
- Operational scripts: [`deploy.sh`](../deploy.sh), [rollback-prod.sh](../scripts/rollback-prod.sh), [backup-prod.sh](../scripts/backup-prod.sh), [restore-prod.sh](../scripts/restore-prod.sh), [sync-local-to-vps.sh](../scripts/sync-local-to-vps.sh)

**Development:** [docker/docker-compose.dev.yml](../docker/docker-compose.dev.yml) + `.env`, or Supabase CLI for local DB.

## 15. Important Environment Variables

Common variables include:

- `NODE_ENV`
- `API_PORT`
- `DATABASE_URL`
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `JWT_SECRET` (access token signing)
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_SECRET`
- `JWT_REFRESH_EXPIRES_IN`
- `MINIO_ENDPOINT`
- `MINIO_PORT`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_BUCKET`
- `IYZICO_API_KEY`
- `IYZICO_SECRET_KEY`
- `IYZICO_BASE_URL`
- `OTP_ACTIVE`
- `PAYMENT_TIMEOUT_MS`
- `STOCK_RESERVATION_TIMEOUT_MS`

Never commit real credentials.

## 16. Development Workflow

Recommended agent workflow:

1. Read docs and `.cursor/rules`.
2. Identify current phase/scope.
3. List files to modify before coding.
4. Implement only requested scope.
5. Run checks.
6. Fix all errors.
7. Report changed files, commands, validation results, and limitations.
8. Stop after the requested scope.

Use pnpm only. Do not switch package managers.

## 17. Frequently Used Commands

Root checks:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check
```

Prisma:

```bash
pnpm prisma:generate
pnpm --filter @pastane/database prisma:migrate:deploy
pnpm --filter @pastane/database prisma:seed
pnpm --filter @pastane/database exec prisma validate --schema=schema.prisma
```

Docker development:

```bash
pnpm docker:dev:up
pnpm docker:dev:down
pnpm docker:dev:logs
```

Health check:

```bash
curl http://localhost:3003/api/v1/health
```

## 18. Testing and Validation Workflow

Before declaring completion, run relevant checks:

- Lint
- Typecheck
- Tests
- Build
- Prisma schema validation
- Migration deploy/check if schema changed
- Seed check if seed changed
- Docker runtime verification when backend/runtime changed
- API health check
- Smoke tests for new endpoints
- Queue worker verification when BullMQ behavior changed
- Role-based smoke: `pnpm e2e:smoke` when stack is up

Backend-sensitive regression areas:

- Auth and refresh tokens
- Permissions and ownership checks
- Payment callback idempotency
- Stock reservation/finalization
- Loyalty movements
- Order status transitions
- Courier ownership
- Review eligibility
- Settings/audit mutations

## 19. Coding Standards

Backend standards:

- NestJS modules/controllers/services/DTOs
- Prisma only through PrismaService
- DTO validation with class-validator
- Standard response interceptor and error format
- Transactions for money, stock, payment, order, loyalty, courier assignment
- Swagger decorators for endpoint clarity
- Decimal handling for money
- No duplicated business logic
- Centralized transition validation for order/delivery status

Frontend standards:

- Next.js 15 App Router
- Server-render public discovery pages where appropriate
- React Hook Form + Zod for forms
- TanStack Table for operational tables
- Tailwind/shadcn-style operational UI
- httpOnly session approach

Mobile standards:

- React Native + Expo only
- TypeScript
- Feature-oriented architecture
- Centralized API/auth/error handling
- No Flutter

## 20. AI Agent Rules and Critical Warnings

Future agents must not:

- Reintroduce Flutter
- Replace pnpm with npm/yarn
- Merge admin/courier/web into one Next.js app
- Convert the project to multi-tenant
- Expose access tokens to browser JavaScript
- Trust client-side totals, prices, stock, points, or delivery fees
- Deduct stock before payment success
- Allow duplicate payment callbacks to finalize twice
- Add optimistic updates to critical order/payment/courier flows
- Bypass backend permission/ownership checks
- Log raw card data, tokens, passwords, OTP codes, or secrets
- Hardcode credentials
- Start mobile implementation without explicit approval
- Start frontend UI work during backend-only tasks
- Overbuild campaigns into a complex promotion engine unless explicitly requested

## 21. Known Out-of-Scope Features

Currently out of scope unless explicitly approved:

- React Native app implementation
- Full loyalty UI
- Campaign UI
- Notification UI
- Refunds
- Live courier tracking
- Maps and route optimization
- Advanced analytics
- Multi-tenant support
- Real production payment/SMS/FCM activation without credentials and deployment planning

## 22. Next Recommended Task

**Operational go-live:** assign DNS/TLS and production credentials, run [`./deploy.sh`](../deploy.sh) on the VPS (or CI equivalent), execute smoke tests and backup drill, then monitor per [monitoring-and-observability.md](monitoring-and-observability.md).

**Product / engineering:** React Native + Expo mobile app remains **out of scope** until explicitly approved.


## 23. Customer Account Area

Customer account coverage now includes:

- `/hesabim` account dashboard using real backend data
- Profile summary and own profile update
- Own password change
- Quick links to orders, addresses, cart, checkout
- Loyalty points, QR/identifier, and recent movements
- Recent orders and payment/status summaries
- Default/saved address summary
- Customer-created review summary
- Recent own notifications
- `/adresler` owner-scoped address management

Important constraints:

- Customers can only read/mutate their own data.
- Backend ownership checks remain authoritative.
- No fake account data should be shown.
- Keep the UI simple until a separate design-polish task is approved.
## Public Storefront Coverage

- Customer public storefront consumes backend-managed public data only; do not show fake campaigns, fake stock, or fake delivery promises as real data.
- Homepage coverage includes `GET /api/v1/banners/home`, `GET /api/v1/categories`, `GET /api/v1/products`, `GET /api/v1/campaigns/active`, `GET /api/v1/stores`, and `GET /api/v1/delivery-zones`.
- Category pages use slug endpoints and should display backend-supported category description, image, and child category links when present.
- Product cards should reflect backend-supported customer-facing fields: real primary image, discount state, preparation time, option availability, and allergen summary when present.
- Product detail pages remain backend-authoritative for catalog data and show gallery, allergens, option groups/options, approved reviews, canonical metadata, breadcrumb JSON-LD, and Product JSON-LD.
- Public reviews must only come from approved review endpoints; pending/rejected/deleted reviews must not be shown.
- Public campaign visibility must follow backend `ACTIVE` + valid date-window behavior from `GET /api/v1/campaigns/active`.
## Authenticated Customer Coverage

- Customer authenticated pages must consume backend-owned data only; do not invent frontend-only balances, totals, payment states, delivery states, or review eligibility.
- `/hesabim` shows profile, phone verification, loyalty account/QR/movements, default address, recent orders, notifications, and customer review history from backend endpoints.
- `/adresler` supports backend-provided owner-scoped address CRUD: create, edit, set default, and soft delete through API proxy.
- `/sepet` uses backend cart rows, including cart item `unitPrice` and selected option modifiers; any displayed cart estimate is informational and must not replace checkout/order authoritative totals.
- `/odeme` must treat `GET /payments/:orderId` as an array of backend payment records and use backend order totals after order creation.
- `/siparisler/[id]` should display order snapshots, address or pickup-store data, delivery/courier status when present, payment records, status history, service fee, loyalty discount, and review eligibility using backend state.
- Critical customer mutations must refetch authoritative backend state; avoid optimistic updates for checkout, payment, order cancellation, address changes, and review creation.