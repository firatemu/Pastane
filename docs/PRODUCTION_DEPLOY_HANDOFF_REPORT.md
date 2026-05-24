# Production deploy — handoff report template

Bu belge VPS ve GitHub tarafında **elde edilen çıktılar** işlendikçe güncellenir. Bu oturumda **VPS SSH / certbot / canlı curl** doğrulanamadı; alanları operatör doldurur.

## 24 maddelik özet checklist

### Lokal yapılanlar

1. [x] Repo kökü doğrulandı (`package.json`, `pnpm-workspace.yaml`, `turbo.json`, `apps/*`, `packages/database` — Prisma).
2. [x] Git remote: `origin` → `firatemu/Pastane`, branch `main`.
3. [x] Geçici artefakatlar silindi (` .turbo`, `apps/*/.next*`, vb.); **`node_modules` korundu** (kurulum zamanı).
4. [x] `.gitignore`: `.env*`, `node_modules`, `.next`, `dist`, `.turbo`, `logs`, `uploads`, `*.log`.
5. [x] **Host Nginx** prod mimarisi: [`docker/docker-compose.prod.yml`](../docker/docker-compose.prod.yml) — Docker `nginx` servisi kaldırıldı; `web`/`admin`/`courier`/`api` + MinIO (`9000`) yalnızca **`127.0.0.1`** yayınları.
6. [x] [`deploy/nginx/pastane-app`](../deploy/nginx/pastane-app) — `storage.azem.cloud` blok eklendi; HTTP `server_name` güncellendi.
7. [x] [`deploy.sh`](../deploy.sh) log satırından `nginx` çıkarıldı.
8. [x] Dokümanlar: [`docs/azem-cloud-vps-deployment.md`](azem-cloud-vps-deployment.md), [`docs/production-deployment-plan.md`](production-deployment-plan.md), [`README.md`](../README.md), [`deploy/nginx/README.md`](../deploy/nginx/README.md), [`docker/nginx/conf.d/pastane.ssl.conf.example`](../docker/nginx/conf.d/pastane.ssl.conf.example), yeni: [`GITHUB_CI_SSH.md`](GITHUB_CI_SSH.md), [`OPERATIONS.md`](OPERATIONS.md).

### Değiştirilen / ek dosyalar (özet)

9. Mobil typecheck düzeltmeleri: `StyleSheet.absoluteFill`, `@types/node`, `pnpm-lock.yaml`.

### Commit (yerel)

Tek commit: `git log -1 --oneline` (bu branch’te tek `chore: align production stack with host nginx…` kaydı).

**Push:** Bu oturumda `git push` **çalıştırılmadı**. Uzak repoya göndermek için:

```bash
git push -u origin main
```

### Commit edilmemeli (doğrulandı veya uyarı)

10. `.env.production`, `.env`, `.env.prod` — tracked değil; **lokal oluşmuş `.env.production`** yalnızca eski yerel prod denemeleri veya `pnpm push:vps` doğrulaması için olabilir → **asıla `git add` yapılmaz.**
11. SSH private key, `.pem` — tracked içerik tarandı (`OK`).
12. `apps/api/dist`, `packages/*/dist` — **Git indeksinden çıkarıldı** (artık tracked değil; derleme çıktıları CI/Docker ile üretilir).

### Lokal doğrulama komut çıktıları

13. `pnpm lint` — başarılı.
14. `pnpm typecheck` — başarılı (mobil düzeltmeleri ile).
15. `pnpm build:ci` — başarılı.
16. `pnpm test` — başarılı (ör. `@pastane/api` 22 suite).
17. `docker compose --env-file .env.production -f docker/docker-compose.prod.yml config`, `docker compose --env-file .env.production -f docker/docker-compose.prod.yml build` — başarılı.
18. **Not:** Lokal ortam Node **20** uyarısı (engine 22); üretide Node 22 önerilir.

### GitHub bağlantısı

19. [x] Remote mevcut; push için yukarıdaki commit gerekiyor.

### VPS yapılması gerekenler (manuel)

20. [`docs/azem-cloud-vps-deployment.md`](azem-cloud-vps-deployment.md) adım adım: clone, `.env.production`, Host Nginx install, `./deploy.sh`, health checks.
21. GitHub Secrets: `VPS_HOST`, `VPS_USER`, `VPS_PORT`, `VPS_SSH_KEY` — detay [`GITHUB_CI_SSH.md`](GITHUB_CI_SSH.md).
22. **SSL:** `sudo certbot` (standalone veya nginx plugin — runbook’ta seçenekler).
23. **GitHub Actions:** `main` push sonrası workflow log doğrulanır.
24. **Kalan işler örnekleri:** Iyzico/Netgsm prod credential, backup cron (`backup-db.sh`), `storage.*` için DNS doğrulama.

---

**Production durumu:** _[Operatör: deploy sonrası “çalışıyor/kısmi başarısız”]_

**Çalışan container’lar:** _[`docker compose ... ps` çıktısı]_

**Health:** _[`curl` sonuçları]_

**SSL:** _[Son geçerlilik / renew dry-run]_

**Actions:** _[workflow run URL]_
