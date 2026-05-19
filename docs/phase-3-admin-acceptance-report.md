# Phase 3 — Admin panel coverage (acceptance report)

## Scope

Implements the **Admin Panel Coverage** plan: align `apps/admin` with backend-supported operational APIs (no redesign, no VPS deploy, no mobile), fix reporting contract bug, and harden Docker dev API URL resolution for the admin proxy.

## Backend

- **No API code changes** in this phase (capabilities already existed).
- **Known seed dead permissions** remain documented in [`phase-3-admin-gap-report.md`](phase-3-admin-gap-report.md): `loyalty.viewReports`, `notifications.manage`, report codes without routes.

## Admin frontend — added or changed

| Area | Details |
|------|---------|
| Navigation | [`apps/admin/lib/permissions/constants.ts`](../apps/admin/lib/permissions/constants.ts): campaigns, loyalty, settings, notifications, audit, users; courier item uses OR of create/update. |
| Pages | `(dashboard)/audit`, `settings`, `notifications`, `campaigns`, `loyalty`, `users` with `requirePermission` aligned to backend. |
| Components | `audit-log-manager`, `settings-manager`, `notifications-send-manager`, `campaigns-manager`, `loyalty-admin-manager`, `users-manager`; `reports-summary` fix; `couriers-manager` permission gates. |
| Schemas/types | [`schemas.ts`](../apps/admin/lib/operations/schemas.ts), [`types.ts`](../apps/admin/lib/operations/types.ts). |
| API client | [`getAdminApiBaseUrl`](../apps/admin/lib/api/client.ts): Docker vs host fallback for `ADMIN_API_URL=http://api:3003`. |
| Docker dev | [`docker-compose.dev.yml`](../docker/docker-compose.dev.yml) + [`apps/admin/Dockerfile.dev`](../apps/admin/Dockerfile.dev): `RUNNING_IN_DOCKER=1` for admin. |
| Couriers route | [`couriers/page.tsx`](../apps/admin/app/(dashboard)/couriers/page.tsx): `requirePermission(..., ['couriers.create', 'couriers.update'])`. |

## Validation

| Command | Result |
|---------|--------|
| `pnpm lint` | Pass |
| `pnpm typecheck` | Pass |
| `pnpm test` | Pass |
| `pnpm build` | **Not verified in this sandbox**: Next.js `EACCES` deleting root-owned `apps/*/.next` artifacts; run `pnpm build` after `sudo chown -R "$(whoami)" apps/admin/.next apps/web/.next` or remove those trees. |

## Smoke (manual)

- Admin login; roles ADMIN / ORDER_OPERATOR / PRODUCT_MANAGER: sidebar matches permissions.
- Direct URL to unauthorized new route → `/access-denied`.
- Campaigns: create, edit, soft-delete (confirm).
- Loyalty: new settings row, manual adjust with userId.
- Settings: system flags save; optional raw key JSON (valid JSON only).
- Notifications: send IN_APP with valid user UUID.
- Audit: table loads.
- Users: list, PATCH name/email/status.
- Reports: product top list non-empty when sales exist; date filters apply.
- Couriers: create hidden without `couriers.create`; edit/deactivate hidden without `couriers.update`.

## Known limitations

- Audit: still backend hard-cap 200 rows, no filter UI.
- Roles/permissions **read** screens not added (only users); use Swagger or future phase if needed.
- Extended report endpoints (`reports.couriers`, etc.) not in backend — no UI.

## Acceptance

**Phase 3 — Admin Panel Coverage: accepted** subject to local `pnpm build` + operator smoke on a clean tree.
