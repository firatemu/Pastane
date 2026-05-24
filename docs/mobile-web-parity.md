# Mobil–web müşteri deneyimi parity

Web müşteri uygulaması (`apps/web`) referans alınır. Mobil (`apps/mobile`) aynı API sözleşmesini (`/api/v1/*`) doğrudan kullanır.

## Durum özeti

| Durum | Anlam |
|-------|--------|
| Eşit | Aynı iş akışı ve görünür alanlar |
| Farklı (kabul) | Bilinçli mobil/web farkı |
| Eksik | Henüz hizalanmadı |

## Sayfa matrisi

| Web route | Mobil route | API | Durum | Notlar |
|-----------|-------------|-----|-------|--------|
| `/` | `/(tabs)` | categories, products, banners, campaigns | Eşit | Banner + kategori şeridi |
| `/shop`, `/kategori/[slug]` | `/(tabs)/products?categoryId=` | products, categories | Farklı (kabul) | Slug URL yok; kategori filtresi ile |
| `/urun/[slug]` | `/product/[slug]` | products/slug, reviews, cart | Eşit | Seçenekler, alerjen, yorum |
| `/sepet` | `/(tabs)/cart` | cart CRUD | Eşit | Sticky özet → checkout |
| `/odeme` | `/checkout` | orders, payments/checkout-form-init | Eşit | Web inline iyzico; mobil WebView |
| `/adresler` | `/addresses/*` | addresses CRUD, default | Eşit | Varsayılan liste + form switch |
| `/siparisler` | `/(tabs)/orders` | orders/my | Eşit | Aktif sipariş polling |
| `/siparisler/[id]` | `/orders/[id]` | orders, cancel, reviews | Eşit | Zaman çizelgesi, yorum |
| `/hesabim` | `/(tabs)/account` | me, loyalty, notifications snippet | Eşit | QR, sadakat özeti |
| `/giris`, `/kayit` | `/login`, `/register` | auth | Eşit | Modal sunum |
| — | `/notifications` | notifications | Farklı (kabul) | Web’de ayrı sayfa yok |
| — | `/payment-result` | orders, payments | Farklı (kabul) | Deep link + sonuç ekranı |
| — | `/profile` | users/me | Farklı (kabul) | Web hesap sayfasında birleşik |

## Mobil-only (kabul)

- **Planlı teslimat** (`scheduledAt`) checkout’ta.
- **Teslimat bölgesi** ön kontrolü (checkout adres seçimi).
- **Bekleyen ödeme** AsyncStorage oturumu.

## Kabul kriterleri (smoke)

1. **Adres:** Adresler → Varsayılan yap → liste güncellenir; yeni adres formunda switch çalışır.
2. **Ödeme:** Sepet → Checkout → İyzico ile öde → WebView formu; pickup ve geçerli ilçe ile ev teslimatı.
3. **Header:** Tüm tab + adres + profil + sipariş detay + ürün detayında `AppHeader` (geri + menü).
4. **Vitrin:** Header arama ikonu arama alanına odaklanır.

## Doğrulama komutları

```bash
pnpm --filter @pastane/mobile typecheck
pnpm --filter @pastane/api test -- iyzico
pnpm mobile:apk:local   # fiziksel cihaz test APK
```

## Ortak hata metinleri

- Paket: `packages/tr-api-errors`
- Mobil: `apps/mobile/src/api/config.ts` (`messageFromApi` + `mapUnknownErrorToTurkish`)
- Web: `apps/web/lib/messages/customer-facing-errors.ts`
