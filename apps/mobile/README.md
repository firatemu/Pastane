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

## Güvenlik (oturum)

Erişim ve yenileme token’ları **`expo-secure-store`** ile Android Keystore / iOS Keychain üzerinden şifreli tutulur. Eski sürümdeki `pastahane.auth` AsyncStorage anahtarı ilk açılışta güvenli depoya taşınır ve silinir.

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

EAS bir monorepoda iki şekilde bağımlılık kurabilir: (a) gönderimden önce kök dizinde **`pnpm install`** ile workspace’yi hazırlamak; (b) `eas.json` içinde seçilen profile `"installCommand"` ekleyerek Expo’nun kod arşivinden önce (örn. `cd ../.. && pnpm install --frozen-lockfile`) kurulum yapmasını istemek. Bu repoda sık kullanılan yöntem: kökten `pnpm install` ve project root’un `apps/mobile` olması.

## Push bildirimi (FCM) ve `google-services.json`

Firebase Cloud Messaging için Play Console’a bağlı Google projesinden **`google-services.json`** indirin ve `apps/mobile/google-services.json` konumuna koyun. Bu dosyayı **asla Git’e commit etmeyin** (`.gitignore`’da yer alır); şema için kökten `apps/mobile/google-services.example.json` referansını kullanın.

## Ödeme deep link (`MOBILE_PAYMENT_SCHEME`)

İyzico mobil checkout için API, uygun ödeme isteklerinde yönlendirmeyi `pastahane://…` vb. şemaya çevirir. Varsayılan şema **`pastahane`**; üretimde farklı bir şema kullanıyorsanız VPS `.env.production` içinde `MOBILE_PAYMENT_SCHEME=` ile API ile aynı değeri verin (`apps/mobile` içindeki `scheme` ile eşleşmeli).

Yerelde Android’de derin bağlantıyı test etmek için (emülatör):

```bash
adb shell am start -a android.intent.action.VIEW -d "pastahane://payment-complete"
```

(IOS Simulator’da `xcrun simctl openurl …` kullanılabilir.)

## API istemci ağı (`NETWORK_ERROR`)

Mobil istemci, kısa süreli bağlantı sorunlarında **yeniden deneme + backoff** uygular; kullanıcıya Türkçe mesaj olarak `@pastane/tr-api-errors` içindeki `NETWORK_ERROR` kodu döner. Bu beklenenden farklıysa önce emülatör/cihaz ağını ve `EXPO_PUBLIC_API_URL` değerini doğrulayın.

## Doğrulama

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

## Yerel APK (tek komut)

Fiziksel cihaz / internal test için **yerelde** preview APK üretir (Expo sunucusu yok). İlk çalıştırma ~15–20 dk sürebilir.

**Önkoşullar (bir kez):**

| Gereksinim | Not |
|------------|-----|
| Node 22 | `nvm install 22 && nvm use 22` |
| JDK 17 | WSL: `sudo apt install openjdk-17-jdk` veya Android Studio JBR |
| Android SDK | Android Studio → SDK; `ANDROID_HOME` genelde `~/Android/Sdk` |
| Docker Desktop | WSL2 entegrasyonu açık |
| EAS | `cd apps/mobile && npx eas login` |

`google-services.json` FCM için isteğe bağlı (yoksa build yine olur).

```bash
# Repo kökünden — önerilen
pnpm mobile:apk:local
```

**Çıktı:** `apps/mobile/artifacts/pasta-hane-preview.apk` (prod API: `https://api.azem.cloud`).

| Komut | Nerede build | Çıktı |
|-------|----------------|-------|
| `pnpm mobile:apk:local` | Yerel (Docker + EAS `--local`) | `artifacts/pasta-hane-preview.apk` |
| `pnpm mobile:build:android:apk` | Expo cloud | Dashboard’dan indir |

Cihaza yükleme: `adb install -r apps/mobile/artifacts/pasta-hane-preview.apk`

## Doğrulama

```bash
pnpm mobile:typecheck
```

## VPS ile birlikte

Backend/web güncellemesi: kökten `pnpm push:vps`. Mobil AAB ayrıca `eas build` ile yeniden üretilir.

### iyzico (mobil ödeme — API tarafı)

Mobil uygulama iyzico anahtarını **APK içine gömmez**; `https://api.azem.cloud` üzerinden checkout form alır. Sandbox için API ortamında şunlar gerekir:

| Değişken | Açıklama |
|----------|----------|
| `IYZICO_MOBILE_API_KEY` | iyzico sandbox API key (boşsa `IYZICO_API_KEY` kullanılır) |
| `IYZICO_MOBILE_SECRET_KEY` | sandbox secret (boşsa `IYZICO_SECRET_KEY`) |
| `IYZICO_MOBILE_BASE_URL` | `https://sandbox-api.iyzipay.com` (boşsa `IYZICO_BASE_URL` veya sandbox varsayılanı) |

Yerel geliştirmede kök `.env` içindeki değerler Docker API’ye `env_file` ile gider. **Mobil prod APK** aynı anahtarları kullanır; VPS’te `.env.production` dosyasına yerel `.env` ile **aynı** `IYZICO_MOBILE_*` (veya yalnızca dolu `IYZICO_*`) değerlerini yazın, ardından `./deploy.sh` ile API’yi yeniden başlatın.
