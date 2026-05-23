# Pasta-Hane Mobile (Expo + React Native)

Müşteri mobil uygulaması — prod API: `https://api.azem.cloud`.

## Gereksinimler

- Node.js 22 (önerilir)
- pnpm
- Android Studio / emülatör veya fiziksel cihaz
- [Expo hesabı](https://expo.dev) (EAS Build için)

## Kurulum

```bash
pnpm install --filter @pastane/mobile...
```

## Ortam değişkenleri

| Dosya | Kullanım |
|-------|----------|
| `.env.development` | Yerel geliştirme (Android emülatör: `10.0.2.2:3003`) |
| `.env.production.example` | Prod şablon — EAS `production` profili aynı URL’leri kullanır |

```env
EXPO_PUBLIC_API_URL=https://api.azem.cloud
EXPO_PUBLIC_WEB_URL=https://azem.cloud
```

Mobil uygulama VPS Docker yığınına deploy edilmez; prod, build sırasında gömülen `EXPO_PUBLIC_*` değerleridir.

## Çalıştırma (dev)

Docker API ayaktayken:

```bash
pnpm docker:dev:up   # kökten — API :3003
pnpm mobile:start    # veya: pnpm --filter @pastane/mobile start
```

Emülatör API adresleri:

| Hedef | `EXPO_PUBLIC_API_URL` |
|-------|------------------------|
| Android emülatör | `http://10.0.2.2:3003` |
| iOS simulator | `http://10.0.2.2:3003` veya makinenizin LAN IP adresi |
| Fiziksel cihaz (LAN) | `http://192.168.x.x:3003` |

Prod API ile smoke test:

```bash
cd apps/mobile
EXPO_PUBLIC_API_URL=https://api.azem.cloud EXPO_PUBLIC_WEB_URL=https://azem.cloud pnpm start
```

## Özellikler (Phase 7)

- Vitrin, kategoriler, ürün detayı (seçenek grupları)
- Sepet (güncelle / sil)
- Giriş / kayıt, oturum yenileme
- Adres CRUD
- Sipariş oluşturma + İyzico Checkout Form (WebView)
- Sipariş listesi, detay, takip, iptal
- Ürün yorumları (teslim sonrası)
- Sadakat puanı + QR
- In-app bildirim listesi

## GitHub + Expo (EAS Build)

1. [expo.dev](https://expo.dev) → **Create project** → **Connect GitHub repository**.
2. **Project root directory:** `apps/mobile` (monorepo alt klasörü).
3. İlk build öncesi yerelde bir kez:

```bash
cd apps/mobile
npx eas-cli login
npx eas init    # projectId → app.config.ts; commit + push
```

4. Expo dashboard veya GitHub entegrasyonundan **Build** → profil `production` (AAB) veya `preview` (APK).

`eas.json` `base.installCommand` kökten `pnpm install --filter @pastane/mobile...` çalıştırır.

## Play Store — Android AAB

1. İlk kurulum (bir kez):

```bash
cd apps/mobile
npx eas-cli login
npx eas init    # EAS_PROJECT_ID → app.config.ts extra.eas.projectId
```

2. Production AAB:

```bash
pnpm mobile:build:android
# veya: cd apps/mobile && eas build --platform android --profile production
```

3. Expo dashboard’dan indirilen **`.aab`** dosyasını [Google Play Console](https://play.google.com/console) → Release → Internal testing / Production → Upload.

### Play Console checklist

- Paket adı: `cloud.azem.pastahane`
- Gizlilik politikası URL
- Store listing (açıklama, ekran görüntüleri)
- Content rating
- EAS managed signing (önerilir) veya kendi upload key

### Profiller (`eas.json`)

| Profil | Çıktı | API |
|--------|-------|-----|
| `development` | Dev client | `.env.development` |
| `preview` | APK (internal) | prod URL |
| `production` | **AAB** (Play Store) | prod URL |

## Doğrulama

```bash
pnpm mobile:typecheck
```

## VPS ile birlikte

Backend/web güncellemesi: kökten `pnpm push:vps`. Mobil AAB ayrıca `eas build` ile yeniden üretilir.
