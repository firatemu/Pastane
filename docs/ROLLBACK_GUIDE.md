# Üretim geri adımı (IMAGE_TAG rollback)

Gerçek senaryoda uygulamayı önceki sürüm imajına döndürmek için VPS kabuğundan **Docker Compose** kullanılıyor ve veritabanını otomatik olarak downgrade etmeye çalışmıyoruz. Bunun arkası bilinçli bir sınırlama; veri yüzünden zarar oluşabilecek durumlarda yedekleme ve restore prosedürlerine güvenilir.

Her başarılı `deploy.sh` akışından önce, mevcut `IMAGE_TAG` değeri **`.pastane-deploy-previous-tag`** dosyasına yazılarak gerektiğinde bir önceki sürüm etiketi el altında kalır (**VPS** üzerindeki depo köküdür).

## Yerel araçlar

Komutların hepsi `scripts/deploy-vps.env.local` tanımlandığında VPS’e SSH açarak `rollback-prod.sh` içindeki mantığı kullanır.

| Komut | Ne yapılır |
|--------|-------------|
| `pnpm deploy:rollback --from-previous-tag` | `.pastane-deploy-previous-tag` dosyasında kayıtlı etiketi okuyup Compose’da servisleri o imaja geri oluşturur. |
| `IMAGE_TAG=v0.9.0 pnpm deploy:rollback` | Etiketi kendiniz verirseniz dosya yerine doğrudan o değer kullanılır (iki seçenek aynı anda verilirse **ortamdaki IMAGE_TAG öncelenir**, dosya tamamen görmezden gelinir — mesaj basılır). |
| `--skip-health` | Rollback başarısından sonra çalıştırılmak istenen yerel `pnpm health:check` adımını atlar. |

`rollback-prod.sh` betiği `docker/docker-compose.prod.yml` üzerinde `api`, `web`, `admin`, `courier` servislerini yeniden yaratır; cutover sonrası deploy öncesi **supabase-db** yığınının ayakta olduğunu doğrular.

## Veritabanı ve uyarılar

- Prisma’nın **`migrate rollback` özelliği** üret akışına bağlanmıyordur — veri yüzünden zarar çıktığında klasik Postgres dump/restore yolunu izlemeniz gerekebilir (`docs/backup-and-restore.md`).
- **Supabase cutover sonrası (Faz 7+):** normal deploy `supabase-db` kullanır. Legacy postgres'e dönmek yalnızca **7 günlük rollback penceresinde** ayrı runbook ile yapılır: [`supabase-legacy-rollback-window.md`](./supabase-legacy-rollback-window.md).
- Mobil veya masaüstü istemcisinin eski sürümle uyumlu olduğundan da emin olun; yalın container geriye alınması bile yeterince olası değildir.
- Yerel klasörümüz içinde oluşabilecek `./.pastane-deploy-previous-tag` dosya adı için `.gitignore` mevcuttur; **geri alma için doğru lokasyon VPS’tir.**

## Deploy sonrası doğrulama

```
pnpm health:check
```

`.env.production` içinde HTTPS URL adresleri tanımlı olması ya da doğrudan `API_HEALTH_URL` ortam değişkenini vermeniz çoğu zaman yeterlidir.

## Diğer belgeler

- [Tam dağıtım akışı](./DEPLOYMENT_WORKFLOW.md)
- [Felakete hazır yedekleme](./backup-and-restore.md)
- [Legacy DB rollback penceresi](./supabase-legacy-rollback-window.md)
- [Örnek VPS yazısı](./azem-cloud-vps-deployment.md)
