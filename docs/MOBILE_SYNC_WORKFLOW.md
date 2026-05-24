# Mobil ↔ API uyum süreci

## Faz A — hızlı kontroller

İki giriş noktanız var:

| Komut | Not |
|--------|-----|
| `pnpm doctor:mobile` | Mobil odaklı doctor modu (`expo-doctor`, typecheck). |
| `pnpm mobile:sync-check` | Faz A + statik olarak `apps/mobile/src/api/client.ts` dosyasında görünen `/api/v1` yollarının çıkarılması. |

Kontroller: `apps/mobile/.env.development` ya da `.env` içinde `EXPO_PUBLIC_API_URL` adresinin eksik olmamasına dikkat edin.

## Faz B — OpenAPI görüntüsü

1. API’yi **Swagger ile** başlatmayı gerektiren durum için `.env` altında `SWAGGER_ENABLED=true` kullanın; JSON uç adresi olarak `GET /api/docs-json` çağrılır (`main.ts`).
2. `pnpm mobile:openapi-export` çıktıyı `docs/contracts/openapi.snapshot.json` dosyasına yazar (`docs/contracts/README.md`).
3. `pnpm mobile:sync-check --openapi` komutu indirilmiş JSON ile `openapi.snapshot.json` dosyasını karşılaştırır; fark varsa Türkçe uyarı basar (işlem çıkışı yalnızca `expo-doctor`/typecheck hatalarında 1 olur).
4. Prisma şema değişiklikleri veya mobil tiplerdeki uyumsuzluklar için hâlen manuel doğrulama listesi gerekebilir; otomatik tipler gelecek fazda düşünülebilir.

### Ortam hatırlatması

- Varsayılan deneme sırasında script önce `PUBLIC_API_URL` veya yerel olarak `127.0.0.1:3003` üzerinden ulaşır. Alternatif olarak `OPENAPI_EXPORT_URL` üzerinden tam JSON URL’si iletebilirsiniz (örnek: `https://staging.example/api/docs-json`).
- Compose ortamına özel dahili URL’leri rapor çıktılarını not ederek takip etmek faydalıdır.

## Rapor seçenekleri

`pnpm mobile:sync-check ... --report` hem komut çıktılarını konsola basar hem de yerel olarak `reports/last-mobile-sync.json` oluşturmaya çalışır (`.gitignore` altındaki `reports/` klasörüdür).

## İlgili belgeler

- [Tam dağıtım akışı](./DEPLOYMENT_WORKFLOW.md)
