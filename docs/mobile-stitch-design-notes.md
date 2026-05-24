# Mobile Stitch Design Notes

Stitch project: [Digital Bakery Platform](https://stitch.withgoogle.com/projects/13485235857020474060)

## Palette (mobile HTML reference)

| Token | Hex |
|-------|-----|
| primary | `#334537` |
| secondary | `#735c00` |
| background / surface | `#faf9f6` |
| secondaryContainer | `#fed65b` |
| onSurface | `#1a1c1a` |
| onSurfaceVariant | `#434843` |
| outlineVariant | `#c3c8c1` |
| error | `#ba1a1a` |

## Typography

- Display: Playfair Display (headlines, brand)
- Body/label: Plus Jakarta Sans

## Screen checklist

- [x] Foundation tokens (`theme.ts`, `design-tokens.ts`)
- [x] AppHeader + tab bar pill active state
- [x] Auth hero + sheet (login/register)
- [x] Home banner carousel + category chips + 2-col grid
- [x] Products search + filters + grid
- [x] Product detail gallery + allergens + custom note
- [x] Cart sticky summary (`CartLineItem`, `CartSummarySticky`)
- [x] Checkout panels + WebView loading overlay
- [x] Payment WebView overlay + result screen + AppState resume
- [x] Orders date filter (`?tarih=`) + status colors
- [x] Order detail courier + timeline
- [x] Account hub + notifications deep link to orders

## RN mapping

| Stitch screen | RN route |
|---------------|----------|
| Mobil Ana Sayfa | `app/(tabs)/index.tsx` |
| Mobil Ürün Listeleme | `app/(tabs)/products.tsx` |
| Mobil Sepetim | `app/(tabs)/cart.tsx` |
| Mobil Müşteri Girişi | `app/login.tsx`, `app/register.tsx` |

## Payment regression matrix (manual)

| Scenario | Expected |
|----------|----------|
| iyzico success | WebView → `pastahane://payment-result?status=success` → CONFIRMED |
| iyzico fail | payment-result fail UI + haptic error |
| User closes WebView | Confirm dialog; pending order retained |
| App background mid-payment | Resume → re-check payment status |
| Network drop on result fetch | Retry via "Ödemeyi tekrar kontrol et" |
| Token refresh during payment | Existing API client retry (manual spot-check) |
| Dev CARD path | Visible only when `__DEV__`; hidden in production UI |

## Verification

```bash
pnpm --filter @pastane/mobile typecheck
```

Manual on device/emulator: auth, catalog search, add-to-cart, checkout, iyzico sandbox, deep link, orders date filter.
