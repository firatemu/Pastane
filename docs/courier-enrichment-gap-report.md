# Courier panel enrichment — gap report

**Phase:** Courier Panel Enrichment — Backend capability reflection  
**Date:** 2026-05-19  
**Sources:** [`apps/api/src/deliveries`](apps/api/src/deliveries), [`packages/database/schema.prisma`](packages/database/schema.prisma), [`apps/courier`](apps/courier)

## 1. Executive summary

- **Liste** (`GET /deliveries/my`) historically returned a **narrow** `order` `select`: identifiers, status, schedule, address snapshot, customer name/phone. Detay (`GET /deliveries/my/:id`) used **`include`** on `order`, so **all Prisma `Order` scalars** (tutarlar, `deliveryType`, `createdAt`, notlar, vb.) were already present in JSON, but the **courier TypeScript model and UI** did not surface most of them. **Ödeme** ve **kalem fiyat anlık görüntüleri** response’ta yoktu (ilişki include edilmiyordu).
- Kurye **sipariş API’sini** (`GET /orders/:id`) kullanamaz: [`OrdersService.getForUser`](apps/api/src/orders/orders.service.ts) siparişi `userId = JWT sub` ile filtreler; kurye müşteri değil.
- Atama kuralı: yalnızca [`HOME_DELIVERY`](apps/api/src/orders/orders.service.ts) siparişlerine kurye atanır; field olarak `deliveryType` çoğunlukla teyit amaçlıdır.
- **Planned enrichment:** widen **liste** `select` for quick-glance ops (order `createdAt`, `grandTotal`, item count, latest `Payment.status`); add **payments** to **detay** `include` with minimal `select`; extend courier UI types, grouping, badges, money/phone/timeline. No maps, no live tracking, no RN app.

## 2. Backend endpoint inventory

| Endpoint | Permission | Ownership | Returns (intended) |
|----------|------------|-----------|-------------------|
| `GET /api/v1/deliveries/my` | `deliveries.viewOwn` | `RoleType.COURIER`; `courier.userId = sub`, `deletedAt: null` | Paginated deliveries + nested `order` (after enrichment: + `createdAt`, `deliveryType`, `grandTotal`, `_count.items`, latest payment `status`) |
| `GET /api/v1/deliveries/my/:id` | `deliveries.viewOwn` | Same + 404 `DELIVERY_NOT_FOUND` | `Delivery` + `order` full scalars + `user`, `items` + `options`, `statusHistory`, **+ `payments` (latest status)** |
| `PATCH /api/v1/deliveries/my/:id/pick-up` | `deliveries.updateOwn` | Same | Updates delivery + order status (see service) |
| `PATCH .../deliver` | `deliveries.updateOwn` | Same | Completes delivery + order |
| `PATCH .../fail` | `deliveries.updateOwn` | Same | Body `{ reason }`; delivery `FAILED` only |

**Query params:** [`QueryMyDeliveriesDto`](apps/api/src/deliveries/dto/query-my-deliveries.dto.ts) — `status`, `page`, `limit`.

## 3. Field-level: courier-safe vs UI (pre-enrichment)

### 3.1 `Delivery` row

| Field | In API | Operational value | Shown pre-enrichment |
|-------|--------|-------------------|---------------------|
| `id`, `status` | Yes | Identity, workflow | Yes |
| `pickedUpAt`, `deliveredAt` | Yes | Timing, duration | Detail yes; list no |
| `failedReason` | Yes | Fail ops | Both (list if FAILED) |
| `createdAt`, `updatedAt` | Yes | Ordering, staleness | Partially (detail updatedAt) |

### 3.2 `Order` (liste `select` — before change)

| Field | In list API | In detail API (include) | Show in UI? |
|-------|-------------|-------------------------|-------------|
| `orderNumber`, `status`, `scheduledAt`, `addressSnapshot`, `user.*` | Yes | Yes | Yes |
| `note` | No | Yes | Detail yes |
| `createdAt`, `updatedAt`, `deliveryType` | Scalars in detail only | Yes | **Gap** — enrich list + show |
| `subtotal`, `deliveryFee`, `serviceFee`, `loyaltyDiscount`, `grandTotal` | Detail scalars | Yes | **Gap** — show totals/detail |
| `items[]` (names, qty, `customNote`, options) | No | Yes | Detail yes; list **gap** (preview) |
| `statusHistory` | No | Yes | Detail yes |
| `payments` | No | No | **Gap** — add API + badge |

### 3.3 `OrderItem` (detail)

| Field | In API | Shown pre-enrichment |
|-------|--------|----------------------|
| `productNameSnapshot`, `quantity`, `customNote`, `options[]` | Yes | Yes |
| `unitPriceSnapshot`, `priceModifier` on options | Yes | **Gap** |

### 3.4 Out of scope / not in courier delivery JSON

| Domain | Reason |
|--------|--------|
| `pickupStore` | Pickup orders not courier-assignable |
| `Review`, `Loyalty` | Not included on delivery queries |
| `DeliveryZone` | Not on order row |
| Admin `/couriers/*` | Courier role lacks `couriers.view` |

## 4. Courier frontend inventory

| File | Role |
|------|------|
| [`deliveries-list.tsx`](apps/courier/components/deliveries/deliveries-list.tsx) | List, polling, flat cards |
| [`delivery-card.tsx`](apps/courier/components/deliveries/delivery-card.tsx) | Card summary |
| [`delivery-detail-panel.tsx`](apps/courier/components/deliveries/delivery-detail-panel.tsx) | Detail, polling, history, items |
| [`delivery-actions.tsx`](apps/courier/components/deliveries/delivery-actions.tsx) | pick-up / deliver / fail; refetch |
| [`types.ts`](apps/courier/lib/deliveries/types.ts) | TS contracts |
| [`polling-note.tsx`](apps/courier/components/shared/polling-note.tsx) | Last refresh |

## 5. UX gaps addressed in this phase

1. Liste: ürün sayısı / kısa özet, sipariş oluşturma zamanı, **ödeme rozeti**, **toplam tutar** (kurye operasyonu — kapıda ödeme bağlamı; kart bilgisi yok).
2. Liste: **gruplama** — Aktif / Bugün tamamlanan / Bugün başarısız / Diğer (client-side, Europe/Istanbul günü).
3. Özet sayılar (üstte chip veya metin).
4. Detay: **özet tutarlar** (`grandTotal`, ücret satırları), **ödeme durumu**, kalem **birim fiyat** / satır görünürlüğü, **teslimat süresi** (`pickedUpAt` → `deliveredAt`).
5. **tel:** bağlantıları (telefon dokunulabilir).
6. **deliveryType** rozeti (çoğunlukla Eve Teslimat).
7. Boş / hata metinleri ve görsel hiyerarşi (redesign değil).

## 6. Backend changes (this phase)

**Yes — minimal and courier-safe:**

- **`listInclude`:** extend `order.select` with `createdAt`, `deliveryType`, `grandTotal`, `_count: { select: { items: true } }`, `payments: { take: 1, orderBy: { createdAt: 'desc' }, select: { status: true } }`.
- **`detailInclude`:** add same `payments` shape under `order.include`.

**Not done:** raw payment amounts, provider IDs, token fields (never in select).

## 7. Validation plan

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm --filter @pastane/courier build` (and root `pnpm build` if env allows).
- Manual: courier login, list grouping, detail fields, mutations + refetch.

## 8. Intentional limitations

- No maps / live GPS / WebSocket.
- No push notifications UI.
- No review/loyalty on delivery payload.
- List does not embed full `items[]` (uses `_count` + optional first-line preview from future if ever added — preview can use count + detail for lines).

---

*This report precedes implementation per project plan.*
