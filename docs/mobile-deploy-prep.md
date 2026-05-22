# Mobile and Production Prep

## Current State

- Customer storefront runs in `apps/web` on port `3000`.
- Admin runs in `apps/admin` on port `3001`.
- Courier runs in `apps/courier` on port `3002`.
- Nest API runs in `apps/api` on port `3003`.
- `apps/mobile` contains the first Expo + React Native customer app implementation.

## Mobile App Direction

- Build the customer mobile app in `apps/mobile`.
- Use Expo + React Native, with direct API calls to `${API_URL}/api/v1`.
- Keep the mobile app customer-focused first:
  - home / featured products
  - categories and product detail
  - cart
  - login/register
  - addresses
  - checkout/order creation
  - order history and order detail
  - profile basics

## API Surfaces To Reuse

- Auth: `/api/v1/auth/login`, `/api/v1/auth/register`, `/api/v1/auth/refresh`, `/api/v1/auth/logout`
- Catalog: products, categories, stores, delivery zones
- Cart: cart and cart items
- Orders: create order, my orders, order detail, cancel
- Addresses: list/create/update/default/delete
- Payments: existing payment endpoints; mobile flow may need a provider-specific decision once production payment mode is finalized
- Users/account: profile and password update

## Mobile Environment

Expected mobile env values:

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_WEB_URL`

For local device testing, `localhost` will not work from a phone/emulator unless mapped correctly:

- Android emulator: `http://10.0.2.2:3003`
- iOS simulator: `http://localhost:3003`
- Physical device: host machine LAN IP, for example `http://192.168.x.x:3003`

## Production Deploy Checklist

- Fill `.env.prod` from `.env.prod.example` with real secrets.
- Set production domains:
  - `DOMAIN_WEB`
  - `DOMAIN_API`
  - `DOMAIN_ADMIN`
  - `DOMAIN_COURIER`
  - `DOMAIN_STORAGE`
- Set public URLs:
  - `WEB_URL`
  - `ADMIN_URL`
  - `COURIER_URL`
  - `API_URL`
  - `PUBLIC_API_URL`
  - `NEXT_PUBLIC_SITE_URL`
  - `MINIO_PUBLIC_DOMAIN`
- Replace placeholder JWT, Postgres, Redis, MinIO, SMTP/SMS/payment values.
- Configure TLS for nginx before real public production.
- Run compose validation before deploy:
  - `docker compose --env-file .env.prod -f docker/docker-compose.prod.yml config`
- Deploy with:
  - `bash scripts/deploy-prod.sh`
- Verify health:
  - API health through nginx
  - storefront loads
  - admin login works
  - customer checkout creates an order
  - media URLs load from storage domain
