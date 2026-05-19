# Official Development Phases

The following plan is the official implementation sequence for the project. Do not implement later phases early.

## Phase 0 — Monorepo and infrastructure setup
Create the working repository skeleton, application shells, shared packages, root tooling, Docker development stack, a basic API health endpoint, and placeholder web/admin/courier pages.

## Phase 1 — Backend core
Consolidate the final Prisma schema, add migrations and seeds, build authentication/users/roles/permissions, standardize soft deletes, add refresh token and OTP foundations, and complete backend cross-cutting infrastructure.

## Phase 2 — Product, category, media, stock
Implement the catalog and bakery-specific stock domain: categories, products, allergens, media, product options, stock, stores, and delivery zones.

## Phase 3 — Cart, order, payment, stock reservation
Implement the critical commerce flow with stock reservation, Iyzico provider integration, idempotent and secure callback handling, duplicate callback protection, timeout jobs, and transaction-safe finalization.

## Phase 4 — Admin panel
Build the operational admin experience for products, categories, stock, orders, courier assignment, reviews, reports, and role-aware UI.

## Phase 5 — Courier panel
Build courier login and delivery workflows for assigned orders, pickup, delivery completion, and failed-delivery handling.

## Phase 6 — Customer web
Build the customer-facing e-commerce experience: browsing, customization, cart, checkout, addresses, tracking, order history, and review creation.

## Phase 7 — Mobile app
Build the React Native + Expo customer application against the shared API, including auth, ordering, tracking, loyalty QR, notifications, and reviews.

## Phase 8 — Loyalty, notifications, campaigns, reports, audit
Complete growth and operational features. Campaigns are reserved architecturally before this phase but implemented only here.
