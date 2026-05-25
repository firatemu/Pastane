# Üretim geri adımı (`IMAGE_TAG` rollback)

Rollback yalnızca uygulama image'larını önceki etikete döndürür; veritabanını otomatik olarak downgrade etmeye çalışmaz. Veri katmanı için gerekirse [backup-and-restore.md](./backup-and-restore.md) yolunu izleyin.

## Tag dosyaları

Production VPS üzerinde:

- `.pastane-deploy-previous-tag`: bir sonraki deploy başarısız olursa geri dönülecek tag
- `.pastane-deploy-current-tag`: son başarılı deploy tag'i

`deploy.sh` yeni deploy başlamadan önce mevcut çalışan `api` image tag'ini `previous` dosyasına yazar. Başarılı deploy tamamlanınca da yeni tag `current` dosyasına yazılır.

## Rollback nasıl çalışır

`scripts/rollback-prod.sh` şu sırayı izler:

1. `IMAGE_TAG` değerini alır
2. Registry login yapar (gerekliyse)
3. `api`, `web`, `admin`, `courier` image'larını o tag için `pull` eder
4. `docker compose up -d --no-build` ile servisleri yeniden yaratır
5. Loopback health check çalıştırır

## Yerel araçlar

Komutların hepsi `scripts/deploy-vps.env.local` tanımlandığında VPS’e SSH açarak rollback mantığını uzaktan çalıştırır.

| Komut                                      | Ne yapılır                                                             |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `pnpm deploy:rollback --from-previous-tag` | VPS’teki `.pastane-deploy-previous-tag` dosyasındaki etiketi kullanır. |
| `IMAGE_TAG=<tag> pnpm deploy:rollback`     | Etiketi siz verirsiniz; dosya okunmaz.                                 |
| `--skip-health`                            | Yerel `pnpm health:check` adımını atlar.                               |

## Veritabanı ve uyarılar

- Prisma’nın `migrate rollback` özelliği production deploy akışına bağlı değildir.
- Production PostgreSQL yalnızca Supabase stack (`supabase-db`) üzerindedir; veri geri alımı için dump/restore gerekir.
- Eski image'a dönerken istemci uyumluluğunu da ayrıca doğrulayın.

## Deploy sonrası doğrulama

```bash
pnpm health:check
```

İhtiyaç halinde:

```bash
PROD_API_URL=https://api.azem.cloud bash scripts/post-deploy-smoke-prod.sh
```

## Diğer belgeler

- [Tam dağıtım akışı](./DEPLOYMENT_WORKFLOW.md)
- [Registry deploy rehberi](./github-actions-registry-deploy.md)
- [Felakete hazır yedekleme](./backup-and-restore.md)
