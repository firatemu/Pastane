# Regression checklist (local prod simulation)

**Version / tag:** _______________  
**Date:** _______________  
**Environment:** Docker prod compose + `.env.prod` + `/etc/hosts` staging names  

Sign-off: ________________________ (name / role)

## Quick matrix

| Area | Check | Pass |
|------|-------|------|
| **Customer** | Home, category, product detail, SEO basics | [ ] |
| **Customer** | Public storefront backend coverage: banners, campaigns, stores, delivery zones, category hierarchy, product-card fields, approved reviews | [ ] |
| **Customer** | Register / login / logout / session | [ ] |
| **Customer** | Cart, customization, checkout validation | [ ] |
| **Customer** | Delivery fee / zones | [ ] |
| **Customer** | Payment (sandbox or documented skip) | [ ] |
| **Customer** | Orders list/detail, protected routes | [ ] |
| **Customer** | Account dashboard /hesabim, profile, addresses, loyalty, reviews, notifications | [ ] |
| **Customer** | Order detail delivery/payment coverage, address edit, cart backend unit prices, checkout payment array handling | [ ] |
| **Customer** | Reviews (when eligible) | [ ] |
| **Admin** | Login, RBAC menus | [ ] |
| **Admin** | Catalog, allergens, media, **homepage banners** | [ ] |
| **Admin** | Stock, stores, zones | [ ] |
| **Admin** | Orders, status, **no** optimistic critical updates | [ ] |
| **Admin** | Courier assignment + **courier management** (accounts / credentials) | [ ] |
| **Admin** | Reviews moderation, reports (incl. date range + `topProducts`), **audit**, **campaigns**, **loyalty admin**, **settings** (flags + raw key), **notification send**, **users** | [ ] |
| **Admin** | **Roles / permissions** read-only (`/roles`, `/permissions`) | [ ] |
| **Courier** | Login, list, detail; timestamps, fail reason, order status, history | [ ] |
| **Courier** | **Enrichment:** grouped queue, payment/totals badges (list), tutar özeti + **tel:** + line prices on detail | [ ] |
| **Courier** | Pickup/deliver/fail; transition + ownership errors (Turkish) | [ ] |
| **Courier** | Wrong-role → `/access-denied`; 401 → login on API calls | [ ] |
| **Courier** | Polling + last refresh + stale warning when refresh fails | [ ] |
| **API** | Health via Nginx (`Host: api.staging.local`) | [ ] |
| **API** | Auth + RBAC 401/403 | [ ] |
| **API** | Rate limits (auth) | [ ] |
| **API** | Stock/payment tests (Jest) | [ ] |
| **Ops** | `SWAGGER_ENABLED=false` / docs not mounted | [ ] |
| **Ops** | No stray DB/Redis/MinIO/API ports on host | [ ] |
| **Ops** | Resilience: API/Redis/Postgres/MinIO restart (see [runtime-recovery-tests.md](runtime-recovery-tests.md)) | [ ] |
| **UX** | Turkish user-facing copy (forms, errors, empty/loading, titles); shared `@pastane/tr-api-errors` | [ ] |

## Failure log

| ID | Area | Symptom | Tracker / PR |
|----|------|---------|----------------|
|    |      |         |                |

---

Detailed steps: [qa-test-scenarios.md](qa-test-scenarios.md).
