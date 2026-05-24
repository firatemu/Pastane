# API OpenAPI kontrat anlık görüntüsü

- **Dosya:** `openapi.snapshot.json` — Swagger etkin olan API (`SWAGGER_ENABLED=true`) için `pnpm mobile:openapi-export` ile üretilir.
- **Karşılaştırma:** `pnpm mobile:sync-check --openapi` indirilen spec ile yerel dosyanın birebir eşleşip eşleşmediğini raporlar.
- **Konum:** Mobil ve web istemci sürümlemesi için görsel olarak incelenmeli; otomatik tip üretimi (ileride `@pastane/api-contract` gibi paketler) bu dosyayı besleyebilir.
