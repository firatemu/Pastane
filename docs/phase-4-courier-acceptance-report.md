# Phase 4 — Courier panel acceptance report

**Date:** 2026-05-19  
**Scope:** `apps/courier` alignment with backend courier/delivery capabilities only — no mobile app, no VPS, no UI redesign.

## Summary

| Question | Answer |
|----------|--------|
| **Phase 4 courier coverage accepted?** | **Yes** — implementation complete; operator smoke on `courier.staging.local` / port **3002** dev still recommended. |

## Backend capabilities reviewed

- `GET/POST` auth (shared); `GET /users/me` for session bootstrap.
- `GET /deliveries/my`, `GET /deliveries/my/:id`, `PATCH .../pick-up`, `.../deliver`, `.../fail` with `deliveries.viewOwn` / `deliveries.updateOwn`, `@Roles(COURIER)`.
- Ownership: tasks not assigned to courier return **404** `DELIVERY_NOT_FOUND`.
- Fail delivery: body `{ reason }`; order status unchanged by design.

**Backend code changes this phase:** none (no blockers in gap report).

## Frontend gaps addressed

| Gap | Mitigation |
|-----|------------|
| Missing fields in UI | List + detail show timestamps, `failedReason`, order status + label, `scheduledAt`, `statusHistory`, `customNote`, directions in address |
| Option row typing / keys | `OrderItemOptionRow` + `orderItemOptionKey()` |
| Generic API errors | `courierApiUserMessage()` maps `error.code` + status |
| Wrong role treated as logged out | `getCourierSession()` → `redirect('/access-denied')` when JWT valid but not COURIER |
| Expired session on client fetches | **401** → `redirectToCourierLogin()` |
| Polling / stale | `PollingNote` shows last success time; poll failure keeps prior data + amber warning |
| Docker API hostname | `getCourierApiBaseUrl()` + `RUNNING_IN_DOCKER` on courier service / Dockerfile |

## Files touched (primary)

- `docs/phase-4-courier-gap-report.md`, `docs/phase-4-courier-acceptance-report.md` (this file)
- `docs/AI_HANDOFF_CONTEXT.md`, `docs/qa-test-scenarios.md`, `docs/regression-checklist.md`, `docs/final-pre-vps-checklist.md`, `docs/human-ui-acceptance-report.md`
- `apps/courier/lib/api/client.ts`, `apps/courier/lib/api/deliveries.ts`
- `apps/courier/lib/auth/session.ts`
- `apps/courier/lib/deliveries/types.ts`, `address-format.ts`, `datetime-format.ts`, `order-status-label.ts`, `courier-api-error.ts`
- `apps/courier/components/deliveries/deliveries-list.tsx`, `delivery-card.tsx`, `delivery-detail-panel.tsx`
- `apps/courier/components/shared/polling-note.tsx`
- `docker/docker-compose.dev.yml` (courier `RUNNING_IN_DOCKER`)
- `apps/courier/Dockerfile.dev` (`ENV RUNNING_IN_DOCKER=1`)

## Validation

| Command | Result |
|---------|--------|
| `pnpm lint` | Pass |
| `pnpm typecheck` | Pass |
| `pnpm test` | Pass |
| `pnpm build` | **Fail** at monorepo level — `EACCES` on `apps/web/.next` (host ownership). **`pnpm --filter @pastane/courier build`** **Pass** after clearing root-owned `apps/courier/.next` (warnings on cache mkdir only). |
| `pnpm docker:prod:config` | Pass |

## Smoke (operator)

Recommended manual checks: `docs/qa-test-scenarios.md` — **CO-01** … **CO-07** (login, transitions, ownership **404**, non-courier **access-denied**, 401 path).

## Known limitations

- No map / live tracking / push notification UI (out of scope).
- `DELIVERY_ACCESS_DENIED` unused in API; ownership continues to surface as **404**.
- Full `pnpm build` may require fixing `.next` ownership for **web/admin/courier** on shared dev machines.

---

**Phase 4 — Courier panel coverage: accepted** (pending human smoke where noted).
