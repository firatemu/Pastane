# Human UI acceptance report (final pre-VPS)

**Date:** 2026-05-19  
**Scope:** Customer web, admin, and courier — bugfix-only stabilization; no features, no VPS, no mobile app.  
**Environment:** Local Docker prod stack ([`docker/docker-compose.prod.yml`](../docker/docker-compose.prod.yml)), `http://127.0.0.1` (Nginx default server = customer **web** per [`docker/nginx/conf.d/pastane.conf`](../docker/nginx/conf.d/pastane.conf)).

---

## Executive summary

| Question | Answer |
|----------|--------|
| **Ready for VPS staging?** | **Yes**, with standard caveats: real DNS/TLS, operator checklist sign-off, full admin/courier pass on `admin.staging.local` / `courier.staging.local` when `/etc/hosts` or DNS resolves correctly (see limitations). |

---

## Viewport / tooling

| Mode | Coverage |
|------|----------|
| Desktop (embedded browser) | Primary pass on customer web (≈ default viewport). |
| Tablet / mobile | Not exhaustively automated in this run; responsive layout was spot-checked on key customer pages only where the tool reported structure (no systematic breakpoint matrix). **Recommend** manual pass on real devices or DevTools device emulation before VPS. |

---

## 1. Customer web (`http://127.0.0.1`)

### Pages / flows exercised (automated browser + logic)

| Area | Result | Notes |
|------|--------|--------|
| Home | Pass | Categories and featured products; pricing `₺…` visible. |
| Product detail (`/urun/yas-pasta`) | Pass | Options (radio/checkbox), allergen area, preview total, reviews empty state. |
| Customization + add to cart | Pass | Required groups selected via labels; **Sepete ekle** with logged-in session persisted line to cart. |
| Cart (`/sepet`) | Pass | Line item, quantity +/- , **Ödemeye geç**, empty state messaging when applicable. |
| Checkout (`/odeme`) | Pass | Fulfillment type, address select, card fields (sandbox demo values), CTA copy. |
| Login (`/giris`) | Pass | Loading state on submit (**Giriş yapılıyor…**), redirect to `/hesabim`. |
| Protected routes | Pass | `/sepet` redirected to `/giris` when anonymous. |
| Orders / review | Not completed in browser | **Recommend:** complete `/siparisler`, order detail, review creation with a delivered order in DB. |

### Issues found and fixes

| Issue | Severity | Fix |
|-------|----------|-----|
| Hero promised “sipariş akışı sonraki adımda” while checkout exists | Copy / trust | Updated [`apps/web/components/home/hero.tsx`](../apps/web/components/home/hero.tsx). |
| `/hesabim` said order history “sonraki batch’lerde” while **Siparişler** nav exists | Copy / trust | Updated [`apps/web/app/(customer)/hesabim/page.tsx`](../apps/web/app/(customer)/hesabim/page.tsx) with links to `Siparişlerim` and `ödeme`. |
| Login phone placeholder was a specific non-customer seed number | UX / confusion | [`apps/web/components/auth/customer-login-form.tsx`](../apps/web/components/auth/customer-login-form.tsx): generic `905XXXXXXXXX`, `inputMode="numeric"`, `autoComplete="tel"`. |

### Other observations (no code change)

- **Featured grid:** product links on home may need precise click target (label vs card); direct URL navigation works. Acceptable unless users report misses.
- **Checkout address:** combobox may show only “Adres seçin” until user adds address flow — validate error messaging on **Siparişi oluştur** if no address (manual).
- **`*.local` hosts:** In some networks, `staging.local` / `admin.staging.local` resolve to CPE/router captive pages. Use **`127.0.0.1` + `Host:`** (curl) or fix `/etc/hosts` for full multi-app browser testing.

---

## 2. Admin panel (`admin.staging.local`)

Full interactive UI in the embedded browser was **blocked** when `admin.staging.local` resolved to a router (not Nginx). **Scripted smoke:**

```bash
curl -sS -o /dev/null -w '%{http_code}\n' -H 'Host: admin.staging.local' http://127.0.0.1/login
# 200
```

### Operator checklist (human)

Use [`docs/final-pre-vps-checklist.md`](final-pre-vps-checklist.md). Confirm: dashboard, catalog CRUD, orders, courier assignment, reviews moderation, reports, role-based menus, table overflow, polling (no forbidden optimistic updates on critical ops).

---

## 3. Courier panel (`courier.staging.local`)

Same **`*.local` limitation** as admin. **Smoke:**

```bash
curl -sS -o /dev/null -w '%{http_code}\n' -H 'Host: courier.staging.local' http://127.0.0.1/login
# 200
```

### Operator checklist (human)

Delivery list/detail, pickup/delivered/failed, ownership denial, mobile-first touch targets — see checklist doc.

---

## Known limitations (pre-VPS)

- **TLS / cookies:** Real staging should use HTTPS + aligned public URLs in `.env.prod` for **Secure** cookie parity.
- **Iyzico:** Sandbox keys required for end-to-end pay redirect verification.
- **Human coverage gap:** Full admin/courier click-through and customer order/review flows should be signed off locally with correct hosts/DNS.

---

## Recommendation

Proceed to **VPS staging** after:

1. Operators complete **`docs/final-pre-vps-checklist.md`** on machines where `admin.staging.local` and `courier.staging.local` resolve to the edge proxy.  
2. `pnpm lint`, `typecheck`, `test`, `docker compose … config` validation (VPS or CI), and prod smoke succeed; `pnpm build` succeeds **after** fixing `.next` ownership (or use `docker compose --env-file .env.production -f docker/docker-compose.prod.yml build` on the server as the production build gate) — see **Validation run** below.

See also: [`docs/local-qa-acceptance-report.md`](local-qa-acceptance-report.md), [`docs/qa-test-scenarios.md`](qa-test-scenarios.md).

---

## Validation run (this change-set)

| Command | Result |
|---------|--------|
| `pnpm lint` | Pass |
| `pnpm typecheck` | Pass |
| `pnpm test` | Pass |
| `pnpm build` | **Fail** — `EACCES` unlink under `apps/{web,admin,courier}/.next/` (root-owned artifacts from Docker/local runs). **Remediation:** `sudo chown -R "$(whoami)" apps/web/.next apps/admin/.next apps/courier/.next` (or delete those trees with sufficient permissions), then re-run; or rely on **`docker compose --env-file .env.production -f docker/docker-compose.prod.yml build`** for production image validation. |
| `docker compose --env-file .env.production -f docker/docker-compose.prod.yml config` | Pass |
| Nginx smoke (`Host: api.staging.local` health; `Host: staging.local` `/`) | Pass (when stack is up) |

### Admin — Phase 3 panel coverage (automated implementation, human smoke pending)

New or expanded routes: **audit**, **system settings**, **notification send**, **campaigns**, **loyalty admin**, **users**, **reports** (top products + date range), **courier** action RBAC. See [`docs/phase-3-admin-acceptance-report.md`](phase-3-admin-acceptance-report.md). Human click-through on `admin.staging.local` still required before VPS sign-off.

### Courier — Phase 4 panel coverage (automated implementation, human smoke pending)

Courier app alignment with Nest `deliveries/my*` and session UX: field visibility (timestamps, `failedReason`, order status, `statusHistory`, line notes, address directions), Turkish API error mapping, wrong-role `/access-denied`, 401 → login on client fetches, polling **last refresh** + stale warning. **Enrichment (2026-05):** grouped task queue, list/order **payment** + **totals** context (no card data), **tel:** on detail, line price snapshots, backend list/detail DTO expansion. See [`docs/phase-4-courier-acceptance-report.md`](phase-4-courier-acceptance-report.md), [`docs/courier-enrichment-acceptance-report.md`](courier-enrichment-acceptance-report.md).

### Final pre-VPS coverage QA (Phase 5)

Gap inventory: [`docs/final-backend-frontend-gap-report.md`](final-backend-frontend-gap-report.md). Acceptance: [`docs/final-system-acceptance-report.md`](final-system-acceptance-report.md). Code: operator seed without `deliveries.viewAll`; admin `/roles` and `/permissions` read-only.

## Customer account coverage update

Authenticated customer area coverage was extended for `/hesabim`, `/adresler`, `/sepet`, `/odeme`, `/siparisler`, and `/siparisler/[id]`.

Human UI acceptance should verify:

- Account dashboard uses real profile, loyalty, notifications, recent orders, and review data.
- Address create/edit/default/delete operations refetch backend state.
- Cart lines show backend unit price and selected option modifiers.
- Checkout shows backend order totals and latest payment status after payment initiation.
- Order detail shows address/pickup info, delivery/courier state when available, payment records, status history, totals, and delivered-item review eligibility.

### Phase 5 — Final Turkish UX QA (2026-05-19)

**Areas checked:** `apps/web`, `apps/admin`, `apps/courier` — formlar (Zod + HTML5), API/BFF hata mesajları (`customerFacingMessage*`, `adminFacingMessage*`, `courier*`), boş/yükleme/hata durumları, `/access-denied`, `layout` metadata, erişilebilirlik etiketleri (ör. breadcrumb).

**Fixes applied (bugfix-only):**

- Kurye `metadata` başlık ve açıklama Türkçeleştirildi.
- Yönetim paneli `metadata` başlığı Türkçeleştirildi (`Pastane — Yönetim paneli`).
- Müşteri breadcrumb `aria-label`: **Sayfa konumu**.
- Gösterge paneli sayfasında görünen **Dashboard** etiketi → **Gösterge paneli**; rol uyarı metni Türkçe.
- Erişim reddedildi sayfasında **Admin paneli** → **Yönetim paneli**.
- Ödeme formu: son kullanma / güvenlik kodu için Türkçe ipucu, yer tutucular ve alan hata özetleri.
- Kurye başarısız teslim formu gönder düğmesi **Kaydet** → **Gönder** (işlem anlamı).

**Kasıtlı İngilizce (teknik / evrensel):**

- Yer tutucu **CVC**, kart endüstrisi kısaltmaları; JSON-LD `BreadcrumbList`; izin/rol **kodları** UI’da salt okunur listelerde; test içi `Invalid credentials` ifadeleri; `autoComplete` / HTTP başlıkları.

**Doğrulama:** `pnpm lint`, `pnpm typecheck`, `pnpm test` — **geçti**. `pnpm build` bu ortamda `apps/web/.next/trace` üzerinde **EACCES** (root sahipliği) nedeniyle **başarısız**; yerelde `sudo chown -R "$(whoami)" apps/*/.next` veya `.next` temizliği sonrası yeniden deneyin.

**Durum:** Türkçe son kullanıcı metinleri hedeflenen kapsamda **tamamlandı**; yeni ekranlarda regresyon için ortak paket ve bu bölüm kullanılmalı.

Tasarım yenilemesi yapılmadı; değişiklikler yalnızca metin ve erişilebilirlik düzeyindedir.