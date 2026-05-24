# PASTANE MOBİL — ANDROID PRODUCTION HARDENING

## BAĞLAM VE MİMARİ

Bu görev, tek bir pastane işletmesi için geliştirilmiş **pnpm monorepo + Turborepo** projesinin
mobil uygulamasını Google Play Store yayınına hazır hale getirmektir.

| Özellik | Değer |
|---------|-------|
| Monorepo | pnpm 10 + Turborepo 2, Node 22 LTS |
| Backend | NestJS API → `https://api.azem.cloud/api/v1` |
| Mobil | `apps/mobile` — Expo SDK 56, Expo Router, React Native 0.85 |
| Bundle ID | `cloud.azem.pastahane` |
| Auth | JWT access (~15dk) + Refresh Token → **SecureStore**'da saklanır |
| Ödeme | İyzico Checkout Form → WebView akışı |
| Hata mesajları | `@pastane/tr-api-errors` paketi (errorCode → Türkçe) |
| Fiyat/stok/durum | Backend otoritesi; istemcide **hesaplanmaz, optimistic update yoktur** |
| Hedef | Yalnızca **Android** (iOS kapsam dışı) |

---

## BAŞLAMADAN ÖNCE: ANALİZ AŞAMASI

Kod yazmadan önce şunları oku ve çıkar:

1. `apps/mobile/` altındaki tüm dosya yapısını tara
2. `app.config.ts` ve `eas.json` oku
3. `src/api/` içindeki API client ve auth refresh interceptor'ı incele
4. `docs/MOBILE-PHASED-PLAN.md`, `docs/mobile-deploy-prep.md`, `docs/MOBILE_SYNC_WORKFLOW.md` oku
5. Mevcut Expo Router route yapısını çıkar
6. İyzico WebView akışını — `checkout.tsx` → `payment-result.tsx` — trace et
7. `apps/web/tailwind.config.ts` oku — tasarım token'larını çıkar (Tasarım Sistemi bölümüne bak)

**Analiz çıktısı:** Düzeltmelere başlamadan önce kısa bir "mevcut durum haritası" yaz.

---

## KRİTİK MİMARİ YASAKLAR

Bu kuralları hiçbir koşulda bozma:

- Mevcut **Expo Router** yapısını değiştirme
- **Redux / Zustand / TanStack** migration yapma
- Backend iş kurallarını mobilde **tekrarlama** — API kullan
- `localhost` veya hardcoded URL bırakma
- `console.log`, mock data, test bypass, fake auth **bırakma**
- Production build'de **debug flag** açık bırakma
- **Optimistic update** ekleme (proje standardı: authoritative refetch)
- API contract'larını bozma
- TypeScript strict uyumluluğunu bozma

---

## TASARIM SİSTEMİ — KAYNAK KURAL

**Mobil için kendi başına renk, font veya spacing üretme.**
Tek kaynak: `apps/web/tailwind.config.ts` — müşteri vitrini tasarım dilidir.

### Adım 1 — Token'ları Oku

`apps/web/tailwind.config.ts` dosyasını aç ve şu token gruplarını çıkar:

**Renkler (`colors`):**

| Grup | Token'lar |
|------|-----------|
| Yüzey | `background`, `surface`, `surface-lowest`, `surface-low`, `surface-container`, `surface-high`, `surface-highest` |
| Marka | `primary` (#334537), `primary-container`, `primary-fixed`, `secondary`, `honey`, `gold` |
| Metin / Çizgi | `ink`, `muted`, `outline`, `outline-soft` |
| Hata | `error` |

**Tipografi:**
- `font-display` → CSS variable (başlık fontu)
- `font-body` → CSS variable (gövde fontu)

**Gölge:** `shadow-ambient`, `shadow-soft`

**Container:** `max-w-stitch-container` → 1200px (web-only, mobilde kullanma)

### Adım 2 — Web Bileşenlerini İncele

`apps/web/src/components/ui/` altındaki şu Shadcn bileşenlerinin görsel kurallarını çıkar:

- **Button** — padding, border-radius, renk varyantları (primary, secondary, ghost, destructive)
- **Input** — border, focus ring, placeholder rengi, padding
- **Card** — background, border, shadow, border-radius
- **Badge** — renk varyantları, padding, font-size
- **Skeleton** — loading state rengi ve animasyonu

### Adım 3 — NativeWind'e Uygula

Çıkardığın token'ları `apps/mobile/` içinde şu şekilde uygula:

```typescript
// apps/mobile/theme/tokens.ts — bu dosyayı oluştur veya güncelle
export const colors = {
  primary: '#334537',          // web'den birebir
  background: '...',           // web'deki hex değeri
  surface: '...',
  ink: '...',
  muted: '...',
  // ... web tailwind.config.ts'ten alınan tüm değerler
} as const;
```

NativeWind `tailwind.config.js` içinde aynı token isimleri kullanılmalı:
```js
// apps/mobile/tailwind.config.js
extend: {
  colors: {
    primary: '#334537',   // web ile aynı
    surface: '...',       // web ile aynı
    // ...
  }
}
```

### Adım 4 — Bileşen Tutarlılığı

Mobil bileşenler web bileşenleriyle görsel olarak eşleşmeli:

| Web (Shadcn) | Mobil (NativeWind) | Kural |
|---|---|---|
| `Button` primary | `TouchableOpacity` / `Pressable` | `bg-primary`, aynı border-radius |
| `Input` | `TextInput` wrapper | Aynı border rengi, focus ring |
| `Card` | `View` wrapper | Aynı shadow, border-radius |
| `Badge` | `View` + `Text` | Aynı renk varyantları |
| Font display | `font-display` class | Aynı CSS variable → expo-font |

### Tasarım Sistem Yasakları

- Web'den **admin** (`apps/admin/tailwind.config.ts`) token'larını alma — admin teması müşteriye değil operatöre aittir
- `apps/courier/` Tailwind'i referans alma — token tanımlı değil
- Yeni renk ismi **türetme** (ör. `primary-dark`, `surface-2`) — web token seti genişletilmeden mobilde icat etme
- Default Tailwind renklerini (`blue-500`, `gray-200`) doğrudan kullanma — her zaman token adını kullan

---

## GÖREV 1 — TAM MOBİL DENETİM

Aşağıdaki her başlığı **incele ve tespit et**; sonraki görevlerde düzelt.

### 1.1 Yapısal Sorunlar
- Broken imports, dead code, kullanılmayan ekranlar
- Tutarsız isimlendirme (kebab-case klasör, PascalCase bileşen olmalı)
- Hardcoded URL, `localhost` kalıntısı
- `console.log`, debug artifact, test bypass
- Mock ödeme veya sahte auth mantığı

### 1.2 Navigation & UX
- Route yapıları ve Expo Router tab/stack tutarlılığı
- Protected route guard — yetkisiz kullanıcı doğru yönlendiriliyor mu?
- Android geri tuşu davranışı (özellikle WebView içinde)
- Splash / loading state yönetimi
- Safe area kullanımı
- Klavye davranışı (KeyboardAvoidingView)
- Empty state ve pagination

### 1.3 Ağ & Durum Yönetimi
- API timeout handling
- Race condition ve duplicate request riski
- Unmounted component'a istek dönmesi (memory leak)
- Polling döngüleri (sipariş takip, İyzico callback bekleme)
- Retry flow ve stale session recovery
- Offline / ağ hatası fallback

---

## GÖREV 2 — KRİTİK AKIŞ DENETİMİ VE DÜZELTME

Her akışı **gerçek production senaryosu** gibi doğrula ve tüm sorunları düzelt.

### 2.1 AUTH
- Kayıt → giriş → token yenileme → otomatik giriş → çıkış
- Expired token recovery ve unauthorized redirect
- SecureStore persistence — access token ve refresh token doğru saklanmalı
- Android release build'de stabil çalışmalı

### 2.2 ÜRÜNLER & KATALOG
- Kategori listesi, ürün detay, görseller (MinIO URL'leri)
- Pagination ve loading skeleton
- `status=ACTIVE`, `isPublished=true`, satış saat penceresi — **backend filtresi**, mobilde tekrar yazma
- Seçenek / birim seçimi (ProductOption, ProductUnit)

### 2.3 SEPET
- Ekleme, güncelleme, silme, opsiyon seçimi
- `POST /cart/validate-checkout` çağrısı checkout öncesi yapılmalı
- Çift tap koruması (duplicate request önleme)
- **Sunucu fiyatı korunmalı** — istemcide toplam hesaplanmaz

### 2.4 ADRESLER
- Oluşturma, güncelleme, silme
- `HOME_DELIVERY` (kayıtlı adres + teslimat bölgesi) / `PICKUP` (aktif mağaza) ayrımı
- Koordinat desteği (adres modeline eklendi, son migration)
- Checkout entegrasyonu

### 2.5 SİPARİŞ OLUŞTURMA
- `POST /orders` → `PAYMENT_PENDING` durumu
- Sipariş durumu: `NEW → PAYMENT_PENDING → CONFIRMED → PREPARING → READY → ASSIGNED_TO_COURIER → OUT_FOR_DELIVERY → DELIVERED`
- Alternatif: `DELIVERY_FAILED`, `CANCELLED`
- İptal edge case'leri ve başarısız ödeme durumları

### 2.6 İYZİCO WEBVİEW ÖDEMESİ *(Production Release için Kritik Öncelik)*

Akış:
```
checkout.tsx
  → POST /payments/checkout-form-init
  → checkoutFormContent WebView'a render
  → Kullanıcı ödeme yapar
  → İyzico → API callback (server-side)
  → Mobil: polling veya deep link ile durum kontrol
  → payment-result.tsx
```

Kontrol et:
- `checkout-form-init` isteği doğru gidiyor mu?
- WebView HTML render sorunsuz mu?
- Ödeme sonrası sipariş durumu **API'den authoritative** çekiliyor mu?
- Başarılı / başarısız yönlendirme doğru mu?
- WebView kapanınca **broken navigation** kalmamalı
- Android geri tuşu WebView içinde doğru davranmalı
- Duplicate callback güvenliği
- Oturum süresi dolmuşsa recovery
- `PAYMENT_PENDING` timeout (BullMQ 600.000 ms) — mobilde bekleme + bilgi ekranı

### 2.7 SİPARİŞ TAKİP
- `orders/[id]` polling stabilitesi — **optimistic update yok, authoritative refetch**
- Arka plan / ön plan geçişinde polling yönetimi
- Tüm teslimat durumları render ediliyor mu?
- Polling, ekran unmount olduğunda **temizlenmeli** (memory leak riski)

---

## GÖREV 3 — PRODUCTION YAPILANDIRMA

### 3.1 `app.config.ts`
```
EXPO_PUBLIC_API_URL = "https://api.azem.cloud"
Android package name: cloud.azem.pastahane
versionCode / buildNumber otomatik artışı
```
- Localhost veya sandbox kalıntısı var mı?
- Dev-only flag production'a sızıyor mu?
- `extra` alanındaki değerler doğru mu?

### 3.2 `eas.json`
- `development` / `preview` / `production` profilleri mevcut ve doğru mu?
- `production` profilinde: `android.buildType = "app-bundle"` (AAB)
- `autoIncrement` yapılandırması
- `runtimeVersion` / OTA update stratejisi

### 3.3 Android İzinleri
- Gereksiz izinler kaldırılmalı
- Zorunlular: `INTERNET`
- Gerekiyorsa: kamera (Sadakat QR okuma), konum (adres için)
- Play Store uyumu: kullanılmayan izin beyanı yok

### 3.4 Varlıklar (Assets)
- Uygulama ikonu: **1024×1024 PNG, şeffaf arka plan yok**
- Adaptive icon: `foregroundImage` + `backgroundColor`
- Splash screen: doğru boyut ve `resizeMode`

---

## GÖREV 4 — PERFORMANS & STABİLİTE

Tespit et ve mümkün olanı düzelt:

- Gereksiz re-render (memo / useCallback eksikliği)
- Aşırı polling (interval temizlenmemiş)
- Ağır liste render — FlatList optimizasyonu (`keyExtractor`, `getItemLayout`, `removeClippedSubviews`)
- Görsel optimizasyonu (büyük MinIO görsellerinde `resizeMode`)
- Ekran geçişlerinde blocking UI
- Unmount edilmiş component'a state set etme

---

## GÖREV 5 — API KONTRAT DOĞRULAMA

`packages/types` ve backend DTO'larıyla mobil kullanımı karşılaştır:

- DTO alan adı uyumsuzluğu
- Nullable / undefined alan farkı
- Enum değeri uyumsuzluğu (örn. sipariş durumu, teslimat tipi)
- Pagination response yapısı: `{ success, data, meta: { page, limit, total, totalPages } }`
- Auth response yapısı
- Order / Payment response yapısı

Type safety sorunlarını düzelt.

---

## GÖREV 6 — HATA YÖNETİMİ VE UX

**Ham backend hatası kullanıcıya gösterilmemeli.**

- `@pastane/tr-api-errors` paketi ile `errorCode` → Türkçe mesaj eşlemesi kullanılıyor mu?
- 401 → oturum sona erdi, giriş ekranına yönlendir
- 422 → alan bazlı validasyon hatası göster
- Ağ hatası → retry butonu ile Türkçe mesaj
- Timeout → kullanıcıya bilgi ver
- Ödeme başarısız → net UX, sipariş durumu doğru
- Empty state: ürün yok, sipariş yok, adres yok ekranları

---

## GÖREV 7 — BUILD DOĞRULAMA

Sırayla doğrula:

```bash
expo doctor
pnpm --filter apps/mobile typecheck
pnpm --filter apps/mobile lint
pnpm mobile:apk:local              # Yerel preview APK (tek komut, artifacts/pasta-hane-preview.apk)
pnpm mobile:build:android:apk    # Preview APK — Expo cloud
pnpm mobile:build:android        # Production AAB — Play Store
```

- Broken dependency → düzelt
- Build-time hata → düzelt
- EAS secret eksikliği → listele

---

## ÇIKTI FORMAT

Her görev tamamlandığında şu yapıda raporla:

```
## [Görev Adı]

### Tespitler
- [Sorun 1]: [Açıklama]
- [Sorun 2]: [Açıklama]

### Yapılan Değişiklikler
- [Dosya]: [Ne değişti]

### Durum
✅ Tamam | 🔧 Düzeltildi | ⚠️ Manuel işlem gerekiyor | ❌ Build engeli
```

---

## GÖREV 8 — PLAY STORE YAYINLAMA CHECKLİSTİ

Tüm görevler bittikten sonra aşağıdaki işaretlenebilir checklist'i doldur:

### Teknik Hazırlık
- [ ] `cloud.azem.pastahane` package name doğrulandı
- [ ] `app.config.ts` — versionCode / buildNumber set edildi
- [ ] `EXPO_PUBLIC_API_URL` production endpoint'e işaret ediyor
- [ ] EAS `production` profili — `buildType: app-bundle` ✓
- [ ] AAB build başarıyla alındı (sıfır hata)
- [ ] SecureStore token yönetimi Android release'de çalışıyor
- [ ] Tüm localhost / sandbox kalıntıları temizlendi
- [ ] Gereksiz Android izinleri kaldırıldı
- [ ] Production'da debug log yok

### Akış Doğrulama (Release Build'de Test Et)
- [ ] Auth: kayıt → giriş → korumalı route → çıkış
- [ ] Ürün kataloğu → sepet → validate-checkout
- [ ] İyzico WebView → başarılı ödeme → sipariş ekranı
- [ ] Başarısız ödeme → doğru hata ekranı
- [ ] Sipariş takip polling — tüm durumlar render ediliyor
- [ ] Ağ hatası durumunda Türkçe hata mesajı
- [ ] Android geri tuşu WebView içinde çalışıyor

### Tasarım Sistemi
- [ ] `apps/mobile/theme/tokens.ts` — web token'larından üretildi
- [ ] NativeWind `tailwind.config.js` web renk token'larıyla eşleşiyor
- [ ] Button, Input, Card, Badge — web Shadcn bileşenleriyle görsel tutarlılık sağlandı
- [ ] Admin veya courier token'ları kullanılmadı
- [ ] Hardcoded Tailwind renk (`blue-500` vb.) kalmadı

### Varlıklar
- [ ] Uygulama ikonu: 1024×1024 PNG (şeffaf arka plan yok)
- [ ] Adaptive icon: foreground + `primary` (#334537) arka plan rengi
- [ ] Splash screen doğru boyut ve resizeMode

### Play Console Gereksinimleri
- [ ] Uygulama kısa açıklaması (Türkçe, maks. 80 karakter)
- [ ] Uygulama tam açıklaması (Türkçe)
- [ ] En az 2 telefon ekran görüntüsü
- [ ] Gizlilik politikası URL'si beyan edildi
- [ ] İçerik derecelendirmesi anketi tamamlandı
- [ ] Hedef kitle beyanı yapıldı
- [ ] Uygulama imzalama — EAS tarafından yönetiliyor (upload key)
- [ ] EAS secrets production ortamında set edildi

---

## ÖNCELİK SIRASI

Sırayla çalış:

1. Auth stabilitesi
2. İyzico ödeme stabilitesi
3. Sipariş akışı bütünlüğü
4. API senkronizasyonu
5. Android production hazırlığı
6. Crash önleme
7. UX polish
8. Performans optimizasyonu

**Hedef: Google Play Store'a gönderilebilir, production seviyesinde stabil Expo Android uygulaması.**
