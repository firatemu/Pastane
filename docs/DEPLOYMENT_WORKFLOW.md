# Pastane yerel geliştirme -> production deploy akışı

Bu belge, geliştirici makinesindeki kalite adımları ile production deploy arasındaki varsayılan yolu açıklar. Yeni modelde **image build/push GitHub Actions içinde**, **pull + up + migrate + health/smoke VPS üzerinde** çalışır.

## Günlük geliştirme

| Komut                        | Amaç                                                                                                                                                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm doctor`                | Node/pnpm, Docker erişimi, `.env`, varsa `.env.production` üzerinden `validate-env`, Prisma `generate`, yerelde `DATABASE_URL` varsa `migrate status`, dev compose durumu ipuçları, Next çıktı klasörleri için hatırlatma. |
| `pnpm doctor:api`            | Önce doktor’un temel adımları, ardından `@pastane/api` için Turbo `typecheck` + `build`; çalışan API için `/health` denemesi.                                                                                              |
| `pnpm doctor:mobile`         | `expo-doctor`, mobil typecheck ve ortam dosya kontrolleri.                                                                                                                                                                 |
| `pnpm doctor:frontend`       | `@pastane/web`, `@pastane/admin`, `@pastane/courier` için Turbo `lint` + `typecheck`.                                                                                                                                      |
| `pnpm mobile:sync-check`     | Expo + mobil typecheck + `client.ts` içindeki kullanılan API yolu listesi.                                                                                                                                                 |
| `pnpm mobile:openapi-export` | Canlı Swagger’dan JSON alıp `docs/contracts/openapi.snapshot.json` yazar (`SWAGGER_ENABLED=true` veya `OPENAPI_EXPORT_URL`).                                                                                               |

Mobil uyum detayı: [MOBILE_SYNC_WORKFLOW.md](./MOBILE_SYNC_WORKFLOW.md).

## Yerel kalite paketi

| Komut            | Kapsama                                                                          |
| ---------------- | -------------------------------------------------------------------------------- |
| `pnpm check`     | Lint + typecheck + test + `build:ci`.                                            |
| `pnpm e2e`       | Docker dev yığını + migration + üç Playwright projesi (`scripts/ci-e2e.sh`).     |
| `pnpm e2e:smoke` | Yalnızca `@smoke` etiketli kısa testler; yerel/stack hazır olduğunda çalıştırın. |

## Önerilen production akışı

1. `pnpm doctor`
2. `pnpm check`
3. `pnpm push:vps`
4. GitHub Actions `deploy.yml` kalan adımları çalıştırır:
   - `pnpm check`
   - Playwright e2e
   - registry image build/push
   - SSH ile VPS `./deploy.sh`
   - `pull + up --no-build`
   - `prisma migrate deploy`
   - health + smoke

`pnpm deploy:prod` komutu bu akışı sarmalar: `doctor` -> `check` -> `push:vps`. Uzun yerel E2E isterseniz `pnpm deploy:prod --with-e2e` kullanabilirsiniz.

## Script davranışı

- `pnpm push:vps`: varsayılan yol; yalnızca `git push` yapar ve GitHub Actions deploy’unu tetikler.
- `./scripts/deploy-vps.sh --remote-only`: acil durumda SSH ile doğrudan VPS `./deploy.sh` çağırır.
- `pnpm git:validate`: kirli dizin, branch ve opsiyonel commit kurallarını denetler.

**Politika özeti:** Yerelde **yalnızca dev** (`pnpm docker:dev:up` / `pnpm dev:*`); production deploy varsayılan olarak **GitHub Actions + registry + VPS pull-only** modelidir.

## Sağlık ve VPS öncesi kontrol

| Komut               | Görev                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `pnpm verify:vps`   | SSH ile disk ve Docker durumu özetini listeler (`VPS_HOST` gerektirir).                                                  |
| `pnpm health:check` | `.env.production` içindeki URL’lere HTTPS/HTTP ile erişerek API `/health`, web ana sayfa ve panel giriş yollarını dener. |

## CI notu

GitHub Actions `deploy.yml` iş akışı commit SHA ile immutable image yayınlar. `push` ile `main` geldiğinde ayrıca `main` tag alias'ı da güncellenir. VPS tarafında rollback için `.pastane-deploy-previous-tag`, son başarılı deploy için `.pastane-deploy-current-tag` tutulur.

## İlgili belgeler

- [Registry deploy rehberi](./github-actions-registry-deploy.md)
- [Rollback rehberi](./ROLLBACK_GUIDE.md)
- [GitHub Actions SSH ayarları](./GITHUB_CI_SSH.md)
- [Örnek VPS kurulum yazısı](./azem-cloud-vps-deployment.md)
- [Yedekleme](./backup-and-restore.md)
