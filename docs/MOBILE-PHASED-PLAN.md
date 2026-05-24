# Mobil uygulama — fazlı geliştirme planı

Web müşteri deneyimi ile tam parite hedeflenir. Her faz bağımsız doğrulanabilir; faz sonunda `pnpm --filter @pastane/mobile typecheck` çalıştırılır.

| Faz | Kapsam | Durum |
|-----|--------|-------|
| **1** | Şifre değiştirme (`changePassword`, `profile.tsx`) | ✅ |
| **2** | Vitrin: aktif kampanyalar + teslimat bölgeleri (`index.tsx`) | ✅ |
| **3** | Harita ile adres konumu (`address-map-picker.tsx`, adres formları) | ✅ |
| **4** | Bildirim okundu API + `notifications.tsx` | ✅ |
| **5** | Hesap UX sadeleştirme + bildirimler ekranı | ✅ |
| **6** | Planlı teslimat `scheduledAt` (`checkout.tsx`) | ✅ |

## Bilinçli kapsam dışı (ileriki faz)

- Expo push (FCM) cihaz token kaydı — backend FCM altyapısı var; mobil entegrasyon ayrı sprint.
- Harici paket `@pastane/mobile-ui` — monorepo ihtiyacı doğunca.

## Doğrulama

```bash
pnpm --filter @pastane/mobile typecheck
pnpm mobile:sync-check   # isteğe bağlı
```
