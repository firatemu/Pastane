# Phase 5 Courier Panel Planning Document

## 1. Scope and planning principles

Phase 5 is limited to courier operations in `apps/courier` plus the minimum backend support needed for courier-owned delivery workflows.

Included in this phase:
- courier login and session flow
- courier-only route protection
- assigned deliveries list
- delivery detail
- mark picked up
- mark delivered
- mark failed with reason
- mobile-first courier UI
- ownership-safe backend endpoints for courier delivery operations

Explicitly excluded from this phase:
- customer web
- mobile customer app
- loyalty UI
- campaigns UI
- notifications UI
- advanced courier tracking
- live map / geolocation / route optimization
- performance dashboards beyond the current Phase 4 admin surface

The courier panel should optimize for:
1. one-handed use on a phone,
2. minimal taps during active delivery,
3. strong ownership guarantees,
4. backend-confirmed state changes,
5. resilience to weak mobile connectivity.

---

## 2. Current backend readiness review

### 2.1 Already available

The backend already provides:
- authentication and role/permission infrastructure
- `COURIER` role with:
  - `deliveries.viewOwn`
  - `deliveries.updateOwn`
  - `orders.viewOwn`
- `Courier` and `Delivery` Prisma models
- order assignment flow from Phase 4:
  - admin/operator assigns courier
  - delivery row is created/upserted
  - order moves `READY -> ASSIGNED_TO_COURIER`
- order status model containing:
  - `ASSIGNED_TO_COURIER`
  - `OUT_FOR_DELIVERY`
  - `DELIVERED`
- delivery status model containing:
  - `ASSIGNED`
  - `PICKED_UP`
  - `OUT_FOR_DELIVERY`
  - `DELIVERED`
  - `FAILED`

### 2.2 Important limitations in the current backend

Current code is not yet sufficient for a courier-facing app:

| Gap | Why it matters |
|---|---|
| No courier-owned delivery list endpoint | Courier cannot fetch only assigned jobs safely |
| No courier delivery detail endpoint | Existing `GET /orders/:id` is customer/admin-oriented and checks order ownership, not courier assignment |
| No courier delivery mutation endpoints | Courier cannot mark picked up / delivered / failed |
| No centralized delivery transition service | Order and delivery statuses need to advance together without drift |
| Failure path is underspecified | Current order state machine has no explicit courier failure terminal state; `FAILED` exists only on `Delivery` |
| No active courier self lookup endpoint | Session can identify user, but courier profile resolution may need backend convenience |

### 2.3 Required backend additions for Phase 5

Recommended minimum additions:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/deliveries/my` | List deliveries assigned to the authenticated courier |
| `GET` | `/deliveries/my/:id` | Courier-owned delivery detail |
| `PATCH` | `/deliveries/my/:id/pick-up` | Mark delivery picked up |
| `PATCH` | `/deliveries/my/:id/deliver` | Mark delivery delivered |
| `PATCH` | `/deliveries/my/:id/fail` | Mark delivery failed with reason |

Optional but useful if the implementation prefers explicit self-resolution:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/couriers/me` | Resolve active courier record for current user |

The preferred architecture is a dedicated `deliveries` module rather than overloading generic order routes. That keeps courier ownership rules explicit and prevents accidental reuse of admin/customer endpoints with the wrong assumptions.

---

## 3. Permission and ownership rules

### 3.1 Application entry

Only authenticated users with role `COURIER` may enter `apps/courier`.

Denied:
- `ADMIN`
- `ORDER_OPERATOR`
- `PRODUCT_MANAGER`
- `CUSTOMER`

Reason: this application is operationally narrow and should not become a second admin surface.

### 3.2 Backend authorization

| Action | Required permission | Ownership rule |
|---|---|---|
| View assigned deliveries | `deliveries.viewOwn` | delivery must belong to courier profile linked to current user |
| View one delivery | `deliveries.viewOwn` | same ownership check |
| Mark picked up | `deliveries.updateOwn` | same ownership check |
| Mark delivered | `deliveries.updateOwn` | same ownership check |
| Mark failed | `deliveries.updateOwn` | same ownership check |

### 3.3 Ownership invariants

- A courier may never view or mutate another courier’s delivery.
- The courier route layer must derive courier identity from the authenticated user, never from a client-supplied `courierId`.
- Any endpoint receiving a `deliveryId` must query using both:
  - `delivery.id`
  - `delivery.courier.userId === authUser.sub`
- Soft-deleted couriers or orders must not be exposed.
- Inactive couriers should not receive new assignments; if already assigned, read/update behavior should be an explicit implementation decision before coding. Recommended default: allow read, block new actions only if business wants hard suspension semantics later.

---

## 4. Delivery and order status model

### 4.1 Recommended courier flow

```text
Admin assignment
Order: READY -> ASSIGNED_TO_COURIER
Delivery: ASSIGNED

Courier picks up
Order: ASSIGNED_TO_COURIER -> OUT_FOR_DELIVERY
Delivery: ASSIGNED -> PICKED_UP or OUT_FOR_DELIVERY

Courier delivers
Order: OUT_FOR_DELIVERY -> DELIVERED
Delivery: PICKED_UP/OUT_FOR_DELIVERY -> DELIVERED

Courier fails delivery
Order: remains OUT_FOR_DELIVERY for Phase 5 unless a later explicit business state is introduced
Delivery: PICKED_UP/OUT_FOR_DELIVERY -> FAILED
```

### 4.2 Transition rules

Recommended `DeliveryStatus` transitions:

| From | Allowed next states |
|---|---|
| `ASSIGNED` | `PICKED_UP` |
| `PICKED_UP` | `OUT_FOR_DELIVERY`, `DELIVERED`, `FAILED` |
| `OUT_FOR_DELIVERY` | `DELIVERED`, `FAILED` |
| `DELIVERED` | none |
| `FAILED` | none in Phase 5 |

Recommended practical simplification for Phase 5 UI:
- button label **“Teslim alındı”** may update delivery to `PICKED_UP` and order to `OUT_FOR_DELIVERY`
- no separate button is required for `OUT_FOR_DELIVERY` unless product requirements later demand it

### 4.3 Open architectural point

The schema includes `DeliveryStatus.FAILED`, but `OrderStatus` does not include a parallel `FAILED_DELIVERY` state. For Phase 5, the safest limited approach is:
- delivery can become `FAILED`
- order remains `OUT_FOR_DELIVERY`
- failed reason is persisted on `Delivery`

This preserves current schema and avoids inventing a wider order lifecycle before the business defines re-dispatch / cancellation / refund behavior. If later operations need a distinct order-level failed-delivery state, that should be handled in a future explicit backend phase, not improvised inside Phase 5.

---

## 5. Route structure

Recommended app routes:

```text
apps/courier/app/
├── (auth)/
│   └── login/
│       └── page.tsx
└── (courier)/
    ├── layout.tsx
    ├── deliveries/
    │   ├── page.tsx
    │   └── [id]/
    │       └── page.tsx
    └── access-denied/
        └── page.tsx
```

Recommended default route:
- `/` redirects to `/deliveries` when authenticated courier
- `/` redirects to `/login` when unauthenticated

Recommended public routes:
- `/login`
- `/access-denied`

Protected routes:
- `/deliveries`
- `/deliveries/[id]`

---

## 6. Page structure

### 6.1 Login page

| Item | Definition |
|---|---|
| Purpose | authenticate courier into dedicated courier app |
| Visible roles | unauthenticated only |
| API dependencies | `POST /auth/login`, optional `GET /users/me` session bootstrap |
| Actions | login |
| Validation | phone required, password required |
| Error states | invalid credentials, non-courier role, network failure |
| Redirect | authenticated courier -> `/deliveries`; other roles -> `/access-denied` |

### 6.2 Assigned deliveries list

| Item | Definition |
|---|---|
| Purpose | show courier’s current assigned work queue |
| Visible roles | `COURIER` only |
| API dependencies | `GET /deliveries/my` |
| Primary filters | active first; optional status filter if backend supports it |
| Default sort | oldest actionable delivery first, then assigned time |
| Actions | open detail |
| Empty state | “Atanmış teslimat yok” |
| Polling | every 15–20 seconds |
| Mobile layout | card list, not dense table |

Suggested card fields:
- order number
- current delivery status
- customer name
- district / short address
- scheduled time if present
- concise CTA: `Detayı aç`

### 6.3 Delivery detail page

| Item | Definition |
|---|---|
| Purpose | execute the delivery safely |
| Visible roles | assigned courier only |
| API dependencies | `GET /deliveries/my/:id` |
| Content | order number, delivery status, customer name, phone, address snapshot, items summary, note, timeline |
| Actions | `Teslim alındı`, `Teslim edildi`, `Teslim edilemedi` |
| Validation | failed reason required; actions visible only for valid current state |
| Polling | every 15–20 seconds, plus refresh after mutation |
| Empty/error states | not found, ownership denied, stale status, network failure |

### 6.4 Failed delivery form

| Item | Definition |
|---|---|
| Purpose | capture operational reason before failure is recorded |
| Visible roles | assigned courier only |
| API dependencies | `PATCH /deliveries/my/:id/fail` |
| Fields | `reason` |
| Validation | required, trimmed, minimum useful length, max length |
| UX | bottom sheet or compact inline form on mobile |
| Safety | submit disabled while request pending; no optimistic update |

---

## 7. API contracts to implement

### 7.1 `GET /deliveries/my`

Recommended response fields:
- `id`
- `status`
- `pickedUpAt`
- `deliveredAt`
- `failedReason`
- nested `order`
  - `id`
  - `orderNumber`
  - `status`
  - `scheduledAt`
  - `addressSnapshot`
  - customer summary

Recommended filters:
- `status`
- pagination

### 7.2 `GET /deliveries/my/:id`

Recommended response fields:
- all list fields
- order items
- order note
- order status history
- delivery timestamps

### 7.3 `PATCH /deliveries/my/:id/pick-up`

Server behavior:
- verify ownership
- verify current `DeliveryStatus === ASSIGNED`
- verify related `OrderStatus === ASSIGNED_TO_COURIER`
- transactionally update:
  - delivery status
  - `pickedUpAt`
  - order status to `OUT_FOR_DELIVERY`
  - order status history

### 7.4 `PATCH /deliveries/my/:id/deliver`

Server behavior:
- verify ownership
- verify delivery is currently actionable
- verify related order is `OUT_FOR_DELIVERY`
- transactionally update:
  - delivery status `DELIVERED`
  - `deliveredAt`
  - order status `DELIVERED`
  - order status history

### 7.5 `PATCH /deliveries/my/:id/fail`

Request body:
```json
{
  "reason": "string"
}
```

Server behavior:
- verify ownership
- verify delivery is currently actionable
- require sanitized failure reason
- transactionally update:
  - delivery status `FAILED`
  - `failedReason`
- do not invent refunds, notifications, or reassignment in Phase 5

---

## 8. State management and polling strategy

### 8.1 UI state

| State type | Handling |
|---|---|
| auth/session | server-derived session + minimal client context |
| deliveries list | server state with client polling |
| delivery detail | server state with client polling |
| form state | React Hook Form + Zod |
| transient UI | component-local state |

### 8.2 Polling

Use polling, not WebSockets.

Recommended cadence:
- deliveries list: 15 seconds
- delivery detail: 15 seconds

Rules:
- polling must pause cleanly on unmount
- mutations must refetch authoritative state after success
- no optimistic updates for status transitions
- stale state conflicts from a second device should surface as backend errors and refresh the view

---

## 9. Recommended UI component structure

```text
apps/courier/
├── components/
│   ├── auth/
│   │   └── courier-login-form.tsx
│   ├── layout/
│   │   ├── courier-shell.tsx
│   │   ├── courier-topbar.tsx
│   │   └── bottom-nav.tsx
│   ├── deliveries/
│   │   ├── delivery-card.tsx
│   │   ├── deliveries-list.tsx
│   │   ├── delivery-detail-panel.tsx
│   │   ├── delivery-status-badge.tsx
│   │   ├── delivery-actions.tsx
│   │   └── failed-delivery-form.tsx
│   └── shared/
│       ├── async-state.tsx
│       ├── polling-note.tsx
│       └── page-section.tsx
├── lib/
│   ├── api/
│   │   └── courier-client.ts
│   ├── auth/
│   │   ├── session.ts
│   │   └── guards.ts
│   ├── deliveries/
│   │   ├── schemas.ts
│   │   ├── status.ts
│   │   └── types.ts
│   └── permissions/
│       └── can.ts
```

Shared design principle:
- reuse architectural ideas from `apps/admin`
- do not visually clone the admin app
- courier UI should be lighter, larger-touch, and task-driven

---

## 10. Mobile-first responsive behavior

### 10.1 Primary layout

| Viewport | Behavior |
|---|---|
| Phone | single-column cards, sticky action area, large tap targets |
| Small tablet | same information order with wider cards |
| Desktop fallback | centered narrow workflow surface, not admin-style wide dashboard |

### 10.2 Interaction rules

- minimum 44px touch targets
- one primary action per current state
- destructive/failure action visually separated
- important delivery address and customer phone visible above the fold
- long addresses wrap naturally
- do not rely on hover
- use bottom navigation only if more than one recurring destination exists; otherwise keep navigation minimal

### 10.3 Operational clarity

Priority order on detail page:
1. current status
2. customer and address
3. primary next action
4. order note / item summary
5. historical details

---

## 11. Error, loading, and empty-state requirements

### Required states

| Surface | Loading | Empty | Error |
|---|---|---|---|
| Login | submitting state | n/a | invalid credentials / denied role |
| Deliveries list | skeleton or compact loading card | no assigned deliveries | API/network issue |
| Delivery detail | loading panel | n/a | not found / ownership denied / stale state |
| Failure form | submit pending | n/a | validation + backend rejection |

### Mutation behavior

- disable action buttons while request is in flight
- after success, refetch from server
- on invalid transition, show backend error and refresh
- never infer success from local state alone

---

## 12. Validation rules

### Frontend

- login:
  - phone required
  - password required
- failure reason:
  - required
  - trimmed
  - minimum useful length
  - bounded maximum length

### Backend

- all courier mutation endpoints require:
  - valid authenticated user
  - `COURIER` role / matching permission
  - assigned delivery ownership
  - valid current delivery status
  - valid current order status when order status is changed
- all transitions should be validated centrally, not duplicated ad hoc in controllers

---

## 13. Testing and runtime verification plan

### 13.1 Backend tests

Unit/integration coverage:
- courier can list only own deliveries
- courier cannot access another courier’s delivery
- `pick-up` only works from `ASSIGNED`
- `deliver` only works from actionable picked-up state
- `fail` requires reason
- duplicate mutation attempts do not create duplicate history
- order and delivery statuses update transactionally together
- invalid transitions are rejected

### 13.2 Frontend tests

- courier-only route guard
- non-courier roles denied
- list renders loading / empty / populated / error states
- detail renders status-specific action visibility
- failure form validates reason
- successful mutations refetch server state
- no optimistic status changes

### 13.3 Runtime verification

Verify in Docker:
- `courier` app starts
- login works for seeded courier
- customer/admin/operator/product-manager are denied
- assigned delivery appears after admin assignment
- pickup flow updates both delivery and order
- delivered flow updates both delivery and order
- failed flow persists reason
- polling refreshes list/detail after backend change
- logs show no runtime errors

### 13.4 Quality gates before acceptance

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Prisma validation if schema changes are introduced
- Docker runtime verification

---

## 14. Recommended implementation batches

### Batch A — Courier backend foundation

Scope:
- create `deliveries` module
- add ownership-safe list/detail endpoints
- add transition service
- add `pick-up`, `deliver`, `fail` endpoints
- add DTO validation and tests

Acceptance:
- authenticated courier can access only own deliveries
- status transitions are transaction-safe
- invalid ownership and invalid transitions are rejected

### Batch B — Courier app foundation

Scope:
- app dependencies
- courier login/session bootstrap
- courier-only route guard
- responsive courier shell
- access denied flow

Acceptance:
- only courier role enters app
- all other roles denied
- session survives navigation and refresh

### Batch C — Assigned deliveries experience

Scope:
- assigned deliveries list
- card UI
- polling
- loading/empty/error states

Acceptance:
- courier sees current assigned jobs only
- list is usable on mobile viewport
- polling refreshes without page reload

### Batch D — Delivery execution workflow

Scope:
- delivery detail
- picked-up action
- delivered action
- failed-delivery form
- backend-confirmed refresh after actions

Acceptance:
- valid state actions only
- no optimistic updates
- failure reason required
- operational flow works end to end

### Batch E — Final hardening

Scope:
- UX consistency
- permission verification
- concurrency / repeated click safety
- Docker/runtime validation
- lint/typecheck/test/build pass

Acceptance:
- Phase 5 fully satisfies courier operations scope
- no Phase 6+ work has started

---

## 15. Recommended implementation order

1. Backend delivery module and ownership-safe APIs
2. Courier auth/session shell
3. Assigned deliveries list
4. Delivery detail
5. Pickup action
6. Delivered action
7. Failed-delivery flow
8. Hardening and verification

---

## 16. Final recommendation

Proceed with a **dedicated `deliveries` backend module first**, then build the courier UI against those explicit courier-owned contracts.

That is the cleanest path because:
- it preserves customer/admin ownership boundaries already established,
- it prevents overloading `orders` endpoints with mixed responsibilities,
- it makes Phase 5 small, focused, and safer to verify,
- it leaves advanced tracking, notifications, and reassignment logic out of scope as requested.
