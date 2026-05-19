# Foundation Architecture Summary

## Architecture
- Single-tenant bakery/pastry platform with one shared backend serving customer web, admin, courier, and mobile clients.
- Turborepo monorepo with executable apps under `apps/` and shared packages under `packages/`.
- NestJS backend, Next.js web surfaces, React Native + Expo mobile app, Prisma + PostgreSQL persistence, Redis + BullMQ queues, MinIO storage, Docker Compose deployment.

## Modules
The backend plan defines 25 modules, including auth, users, addresses, roles, permissions, OTP, categories, products, allergens, media, stock, stores, cart, orders, payments, couriers, deliveries, delivery zones, loyalty, reviews, notifications, campaigns, settings, reports, and audit.

## Workflows
- Standard API responses use success/error envelopes and paginated metadata.
- Payment begins with stock reservation; successful callbacks finalize stock and loyalty effects inside transactions.
- Notifications, payment timeouts, stock reservation timeouts, media processing, and reporting use background jobs.
- Role and permission checks are combined with service-layer ownership validation.

## Backend standards
- Modular NestJS layout, DTO validation, Swagger documentation, guards/decorators, transaction safety, centralized errors, response interceptors.

## Frontend and mobile standards
- Customer web emphasizes visual quality and conversion.
- Admin emphasizes operational clarity.
- Courier emphasizes mobile-first speed and simplicity.
- Mobile uses React Native + Expo with centralized API, notification, and state-management conventions.

## Docker structure
- Separate dev/prod Compose files.
- Nginx is the only public production ingress.
- PostgreSQL, Redis, MinIO, and application services remain internal in production.
- Ubuntu 24.04 LTS is the target deployment platform.

## Development phases
The current documentation defines MVP scope and workflow constraints but does not include a dedicated numbered phase plan file. Until one is added, AI agents must treat the user-provided active phase as authoritative and avoid implementing future work early.
