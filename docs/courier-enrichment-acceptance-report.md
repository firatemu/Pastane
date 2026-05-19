# Courier enrichment — acceptance report

**Date:** 2026-05-19  
**Scope:** Courier Next.js panel + Nest `deliveries` read surfaces — operational visibility only (no redesign, no maps, no mobile app, no VPS).

---

## 1. Backend courier capabilities discovered

| Surface | Capability |
|---------|------------|
| `GET /api/v1/deliveries/my` | Paginated, `courier.userId`-scoped; query `status`, `page`, `limit`. **Enriched** `order.select`: `createdAt`, `deliveryType`, `grandTotal`, `_count.items`, latest `payments.status` only. |
| `GET /api/v1/deliveries/my/:id` | Same ownership; `order` `include`: `user`, `items`+`options`, `statusHistory`, full order scalars (Prisma), **+ `payments` (latest `status` only)**. |
| `PATCH .../pick-up`, `.../deliver`, `.../fail` | Unchanged lifecycle; refetch after mutation remains client responsibility. |

`/orders` is **not** used by couriers for order lookup (`getForUser` filters by customer `userId`).

---

## 2. Previously missing frontend operational visibility (addressed)

- Liste: üst **özet** (aktif / bugün teslim / bugün başarısız), **İstanbul günü** etiketi, **bölüm başlıkları** (aktif görevler, bugün tamamlanan, bugün iptal·başarısız, önceki kayıtlar).
- Kart: **teslimat tipi**, **ödeme özeti rozeti**, sipariş **oluşturulma** zamanı, **kalem sayısı**, **genel toplam** (varsa).
- Detay: **ödeme rozeti**, **tutar özeti** (ara toplam, teslimat, hizmet, sadakat indirimi, puan kullanımı, genel toplam), **sipariş oluşturulma**, **yolda süre** (alındı→teslim), **tel:** bağlantısı, kalem **birim fiyatı** / **satır tahmini** (anlık görüntü + opsiyon fiyat farkları), sipariş **zaman çizelgesi** başlığı.

---

## 3. Backend changes made

| Change | File |
|--------|------|
| `listInclude` + `detailInclude` expanded; service formatted for maintainability | [`apps/api/src/deliveries/deliveries.service.ts`](apps/api/src/deliveries/deliveries.service.ts) |

**Security:** Ödeme yanıtında yalnızca `status` seçilir; tutar, token, provider ID dahil edilmez.

---

## 4. Courier UI enrichments implemented

- Gruplama: [`apps/courier/lib/deliveries/group-deliveries.ts`](apps/courier/lib/deliveries/group-deliveries.ts)
- Para / ödeme / teslimat tipi etiketleri: `money-format.ts`, `payment-status-label.ts`, `delivery-type-label.ts`
- Satır tutarı: `line-total.ts` + [`line-total.spec.ts`](apps/courier/lib/deliveries/line-total.spec.ts)
- Types: [`apps/courier/lib/deliveries/types.ts`](apps/courier/lib/deliveries/types.ts)
- Bileşenler: [`delivery-card.tsx`](apps/courier/components/deliveries/delivery-card.tsx), [`deliveries-list.tsx`](apps/courier/components/deliveries/deliveries-list.tsx), [`delivery-detail-panel.tsx`](apps/courier/components/deliveries/delivery-detail-panel.tsx), [`async-state.tsx`](apps/courier/components/shared/async-state.tsx) (boş durum metni)
- Süre: [`datetime-format.ts`](apps/courier/lib/deliveries/datetime-format.ts) (`formatDeliveryDuration`)

---

## 5. Files changed (summary)

| Area | Paths |
|------|--------|
| Docs | `docs/courier-enrichment-gap-report.md` (new), `docs/courier-enrichment-acceptance-report.md` (this file), `docs/AI_HANDOFF_CONTEXT.md`, `docs/qa-test-scenarios.md`, `docs/regression-checklist.md`, `docs/human-ui-acceptance-report.md` |
| API | `apps/api/src/deliveries/deliveries.service.ts` |
| Courier | `apps/courier/lib/deliveries/*` (new + `types.ts`, `datetime-format.ts`), `components/deliveries/*.tsx`, `components/shared/async-state.tsx` |

---

## 6. Validation results (automated)

| Command | Result |
|---------|--------|
| `pnpm typecheck` | Pass |
| `pnpm test` | Pass (API Jest + courier Vitest + other packages) |
| `pnpm --filter @pastane/courier lint` | Pass |
| `pnpm --filter @pastane/api lint` | Pass |
| `pnpm --filter @pastane/courier build` | Pass |
| `pnpm lint` (root turbo) | **Fail**: `@pastane/tr-api-errors` ESLint `no-require-imports` on `next-webpack.cjs` — **pre-existing**, not introduced by this phase |

---

## 7. Runtime smoke (manual / operator)

| Scenario | Status |
|----------|--------|
| Courier login / logout / session | **Recommend** operator confirm on `:3002` |
| Liste grupları + özet | **Recommend** confirm with seed + assigned deliveries |
| Detay tutar / ödeme / tel / ürün satırları | **Recommend** confirm against API JSON |
| pick-up / deliver / fail + refetch | **Recommend** unchanged flow regression |
| Yanlış sahiplik (404) | **Recommend** per CO-04 |
| Mobil görünüm | **Recommend** DevTools veya cihaz |

Bu oturumda tam otomatik tarayıcı smoke çalıştırılmadı; yukarıdaki komutlar ve kod incelemesi tamamlandı.

---

## 8. Remaining intentional limitations

- Harita, canlı konum, WebSocket takip yok.
- Push bildirim UI yok.
- Review / loyalty teslimat payload’ında yok.
- `PICKUP` siparişleri kurye atamasına kapalı; `pickupStore` bu yüzden kurye akışında düşük öncelik.
- Liste endpoint’inde tam `items[]` yok (performans / özet odaklı); detayda kalemler tam.

---

## 9. Operational alignment conclusion

**Evet:** Kurye arayüzü, `deliveries` API’sinin izin verdiği operasyonel alanlarda (durum, adres, müşteri iletişimi, notlar, geçmiş, tutar/ödeme **özeti**, zaman damgaları) backend ile **daha uyumlu** hale getirildi; veri kaynağı hâlâ **yalnızca backend**.

**Referans:** plan ve boşluk analizi: [`docs/courier-enrichment-gap-report.md`](courier-enrichment-gap-report.md).
