# Final system acceptance report (Phase 5)

**Date:** 2026-05-19  
**Phase:** Final backend ↔ frontend coverage QA & pre-VPS operational acceptance (no redesign, no VPS deploy, no mobile).

---

## 1. Backend capability coverage result

| Area | Status |
|------|--------|
| Customer-facing APIs | Reflected in [`apps/web`](apps/web) storefront + account + checkout proxies |
| Admin operational APIs | Reflected in [`apps/admin`](apps/admin) including **roles** (`GET /roles`) and **permissions** (`GET /permissions`) read-only screens added this phase |
| Courier APIs | Reflected in [`apps/courier`](apps/courier) per Phase 4 |
| Intentionally backend-only | Payment provider callbacks, health, some seed-only permission codes without routes |

Detailed inventory: [`docs/final-backend-frontend-gap-report.md`](final-backend-frontend-gap-report.md).

---

## 2. Remaining uncovered capabilities

| Item | Classification |
|------|----------------|
| Admin payment refunds / `payments.refund` | **Out of scope** pre-VPS (no UI) |
| `reports.couriers` / `reports.customers` / `reports.loyalty` | **No API routes** — seed/docs only |
| `loyalty.viewReports`, `notifications.manage` | **Dead** permission codes (no `@Permissions`) — documented |

---

## 3. Operational blockers status

| Blocker | Status resolved |
|---------|-----------------|
| Misleading `deliveries.viewAll` on ORDER_OPERATOR | **Yes** — removed from operator role in seed |

---

## 4. Permission / security review result

- **ORDER_OPERATOR** no longer implies “all deliveries” without an API route.
- **ADMIN** retains full permission catalog in seed; **roles** and **permissions** pages require `roles.view` / `permissions.view` (ADMIN-only in practice).
- Cross-app isolation (customer vs admin vs courier) unchanged; prior phase patterns preserved.

---

## 5. Runtime / Docker review result

- **`pnpm docker:prod:config`:** Pass.
- **`pnpm build` (host):** May fail with **EACCES** on `apps/*/.next` when trees are root-owned — use `chown`/delete or **`pnpm docker:prod:build`** as gate.
- Dev stack API URL helpers aligned across web/admin/courier (prior work + docs).

---

## 6. Validation command results

| Command | Result |
|---------|--------|
| `pnpm lint` | Pass |
| `pnpm typecheck` | Pass |
| `pnpm test` | Pass |
| `pnpm build` | **Fail** (host `.next` EACCES on web/admin/courier in this environment) |
| `pnpm docker:prod:config` | Pass |

---

## 7. Known intentional limitations

- No courier live map, no push notification UI, no React Native app.
- Audit list capped at backend **200** rows, no filters.
- Human full UI matrix still recommended on `*.staging.local` before VPS.
- **Existing dev/prod DBs:** re-run seed or migrate `RolePermission` so **ORDER_OPERATOR** no longer has `deliveries.viewAll` (fresh seed applies the fix automatically).

---

## 8. Readiness statement

| Milestone | Ready? |
|-----------|--------|
| **Local final QA** | **Yes**, with checklist sign-off and host build/Docker notes above |
| **VPS staging** | **Yes**, after DNS/TLS/env parity and operator regression pass (not a code blocker from this phase) |
| **Frontend design / polish phase** | **Independent** — functionally aligned for approved scope |

---

## 9. Operational alignment question

**Are backend and frontend operationally aligned for the approved pre-VPS scope?**

**Yes** — with explicit caveats: documented dead/unused permission codes remain in the global catalog; payment refund and extra report endpoints are not part of this scope; host `pnpm build` may require fixing `.next` ownership; operators should complete manual smoke on staging hosts.

---

**Related:** [`docs/final-backend-frontend-gap-report.md`](final-backend-frontend-gap-report.md), [`docs/phase-3-admin-acceptance-report.md`](phase-3-admin-acceptance-report.md), [`docs/phase-4-courier-acceptance-report.md`](phase-4-courier-acceptance-report.md), [`docs/regression-checklist.md`](regression-checklist.md).
