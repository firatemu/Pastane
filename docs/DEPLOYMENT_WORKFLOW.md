# Pastane yerel geliştirme → VPS üretimi akışı

Bu belge, kökteki **tsx orkestrasyon komutları** ile zaten kullandığınız bash araçları arasında köprü kurar. Davranışı değiştirmediğimiz betikler: `scripts/validate-env.sh`, `scripts/ci-e2e.sh`, `scripts/push-vps.sh`, `scripts/deploy-vps.sh`, VPS’te kök `deploy.sh`, `scripts/post-deploy-health.sh`, `scripts/rollback-prod.sh`.

## Günlük geliştirme

| Komut | Amaç |
|--------|------|
| `pnpm doctor` | Node/pnpm, Docker erişimi, `.env`, varsa `.env.production` üzerinden `validate-env`, Prisma `generate`, yerelde `DATABASE_URL` varsa `migrate status`, dev compose durumu ipuçları, Next çıktı klasörleri için hatırlatma. |
| `pnpm doctor:api` | Önce doktor’un temel adımları, ardından `@pastane/api` için Turbo `typecheck` + `build`; çalışan API için `/health` denemesi. Tam testleri açmak için `DOCTOR_WITH_API_TESTS=1` veya `--with-api-tests`. |
| `pnpm doctor:mobile` | `expo-doctor`, mobil typecheck ve ortam dosya kontrolleri. |
| `pnpm doctor:frontend` | `@pastane/web`, `@pastane/admin`, `@pastane/courier` için Turbo `lint` + `typecheck`. İstenirse `--with-smoke` ile `pnpm e2e:smoke` (önce ortamınız ayakta olmalıdır). |
| `pnpm mobile:sync-check` | Expo + mobil typecheck + `client.ts` içindeki kullanılan API yolu listesi. |
| `pnpm mobile:openapi-export` | Canlı Swagger’dan JSON alıp `docs/contracts/openapi.snapshot.json` yazar (`SWAGGER_ENABLED=true` veya `OPENAPI_EXPORT_URL`). |

Mobil uyum detayı: [MOBILE_SYNC_WORKFLOW.md](./MOBILE_SYNC_WORKFLOW.md).

## Yerel kalite paketi

| Komut | Kapsama |
|--------|---------|
| `pnpm check` | Lint + typecheck + test + `build:ci`. |
| `pnpm e2e` | Docker dev yığını + migration + üç Playwright projesi (`scripts/ci-e2e.sh`). |
| `pnpm e2e:smoke` | Yalnızca `@smoke` etiketli kısa testler; **`ci-e2e` beklemesi yok** — yerel/stack hazır olduğunda çalıştırın. |

## Prod deploy sırası

2. `pnpm deploy:prod` akışı: `pnpm doctor` (isteğe bağlı `--skip-doctor`) → `pnpm check` → `bash scripts/push-vps.sh` (**yalnızca VPS `./deploy.sh`**). Uzun E2E isterseniz `--with-e2e` ekleyin.
3. `push:vps.sh` / `deploy-vps.sh` ek seçenekleri (`--skip-checks`, `--allow-dirty`, `--push-only`, `--dry-run`) doğrudan `./scripts/deploy-vps.sh` ile de denenebilir — **geliştiricide üretim Compose tetiklenmez**.

`pnpm git:validate` seçenekleriyle kirli dizin uyarısı, `main` dışında dal uyarısı ve isteğe bağlı Conventional Commit kontrolünü yapabilirsiniz. **Varsayılan davranışta otomatik commit yoktur.**

**Politika özeti:** Yerelde **yalnızca dev** (`pnpm docker:dev:up` / `pnpm dev:*`); üretim **VPS** (`./deploy.sh`). Onaylanan kod **`pnpm push:vps`** ile `main` dalından sunucuya gider.

## Sağlık ve VPS öncesi kontrol

| Komut | Görev |
|--------|-------|
| `pnpm verify:vps` | SSH ile disk ve Docker durumu özetini listeler (`VPS_HOST` gerektirir). |
| `pnpm health:check` | `.env.production` içindeki URL’lere HTTPS/HTTP ile erişerek API `/health`, web ana sayfa ve panel giriş yollarını dener (`API_HEALTH_TRIES`, `API_HEALTH_DELAY_SEC` ile CI’deki beklemeye benzer yapı kurulabilir). |

## CI notu

GitHub Actions `deploy.yml` iş akışı `pnpm check` + Playwright + uzak `./deploy.sh` + sağlık kontrolüdür; gerekli olduğunda önceki `IMAGE_TAG` değeri okunarak Compose geri oluşturulur. Yerelde en yakın birebir tekrarı `pnpm deploy:prod --with-e2e` verir (**zaman maliyeti yüksektir**).

## İlgili belgeler

- [Rollback rehberi](./ROLLBACK_GUIDE.md)
- [Örnek VPS kurulum yazısı](./azem-cloud-vps-deployment.md)
- [Yedekleme](./backup-and-restore.md)
