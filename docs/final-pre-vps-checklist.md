# Final pre-VPS checklist

Use this checklist **on a machine where** `staging.local`, `api.staging.local`, `admin.staging.local`, and `courier.staging.local` resolve to your Nginx edge (typically `/etc/hosts` → `127.0.0.1` during local rehearsal, or real DNS on VPS).

**Version / image tag:** _______________  
**Date:** _______________  
**Tester:** _______________

---

## Environment

- [ ] `docker compose --env-file .env.prod -f docker/docker-compose.prod.yml ps` — all services up
- [ ] `curl -H 'Host: api.staging.local' http://127.0.0.1/api/v1/health` → 200
- [ ] `SWAGGER_ENABLED=false` for staging-style runs

---

## Customer web (`staging.local` or documented web host)

| Check | Pass |
|-------|------|
| Home (incl. **CMS hero banners** or fallback), category, product detail | [ ] |
| Customization + add to cart | [ ] |
| Cart + checkout | [ ] |
| Order list + detail / tracking | [ ] |
| Review creation (eligible order) | [ ] |
| Register / login / logout | [ ] |
| Protected route redirects | [ ] |
| TR copy, ₺ and date formatting | [ ] |
| Images / placeholders | [ ] |
| Empty / loading / error states | [ ] |
| Forms validation + disabled/loading buttons | [ ] |
| Layout overflow (mobile / tablet / desktop) | [ ] |

---

## Admin (`admin.staging.local`)

| Check | Pass |
|-------|------|
| Login / logout | [ ] |
| Dashboard | [ ] |
| Products, categories, allergens, **homepage banners** | [ ] |
| Stock, stores, delivery zones | [ ] |
| Orders + detail + status actions | [ ] |
| Courier assignment | [ ] |
| **Courier management** (`/couriers`, admin-only: accounts, credentials, activate/deactivate) | [ ] |
| Reviews moderation | [ ] |
| Reports (date range, top products) | [ ] |
| **Audit** log viewer | [ ] |
| **Campaigns** CRUD | [ ] |
| **Loyalty** settings + manual adjust | [ ] |
| **System settings** (flags + optional raw key) | [ ] |
| **Roles** + **permissions** (read-only directories) | [ ] |
| **Users** directory + profile patch | [ ] |
| Permission-based visibility / route guards | [ ] |
| Tables, filters, forms | [ ] |
| Confirmations; loading / empty / error | [ ] |
| Polling; no forbidden optimistic critical updates | [ ] |

---

## Courier (`courier.staging.local`)

| Check | Pass |
|-------|------|
| Login / logout | [ ] |
| Assigned deliveries list + list card fields | [ ] |
| Detail + data | Timestamps, fail reason, order status, scheduled time, notes, line notes, history, full address | [ ] |
| Pickup / delivered / failed + reason | [ ] |
| Wrong-role session → `/access-denied`; 401 → login on refresh | [ ] |
| Wrong-courier / ownership denial (404 messaging) | [ ] |
| Polling; empty / error / stale | [ ] |
| Mobile-first: touch targets, clarity | [ ] |

---

## Sign-off

- [ ] All critical items above checked or waiver documented  
- [ ] No open **severity-high** UI/regression bugs  

**Recommendation:** [ ] Ready for VPS staging [ ] Not ready — blockers: _______________

**Signature:** _______________

---

**Related:** [human-ui-acceptance-report.md](human-ui-acceptance-report.md), [qa-test-scenarios.md](qa-test-scenarios.md), [regression-checklist.md](regression-checklist.md).

**CI note:** If `pnpm build` fails with `EACCES` on `apps/*/.next`, fix ownership per [development-workflow.md](development-workflow.md) or validate with `pnpm docker:prod:build`.
