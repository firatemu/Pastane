# GitHub Actions — production deploy SSH

Workflow: [.github/workflows/deploy.yml](../.github/workflows/deploy.yml)

Trigger: push to `main`, or manual **workflow_dispatch**.

## Secrets ve Actions Variables (`vars`)

Workflow **`secrets.NAME` sonra `vars.NAME`** sırasıyla doldurur (Repository **Secrets** veya **Variables** ile aynı isimleri kullanın).

- **Secrets:** `https://github.com/YOUR_OWNER/Pastane/settings/secrets/actions`
- **Variables:** `https://github.com/YOUR_OWNER/Pastane/settings/variables/actions`

`VPS_HOST`, `VPS_USER`, isteğe bağlı `VPS_PORT` Variables’ta saklanabilir.

**`VPS_SSH_KEY` mutlaka Secret olmalı** — Variable olarak private key yazmayın; Actions’ta düzgün maskelenmez ve daha kolay sızdırılabilir.

**GitHub Environment** (Deployments → Environment) kullanıyorsanız değişkenler/secrets genelde **o ortama** bağlıdır: `deploy` job’unun altına **`environment: ortam-adınız`** satırını ekleyin (`deploy.yml`). Aksi halde workflow bu değerleri görmez.

### Private anahtar paylaşıldıysa (sohbet, ticket, yanlış alan)

1. Sunucuda eşlenen **public key** satırını `deploy` için `authorized_keys` içinden kaldırın.
2. Yeni anahtar çifti oluşturun; yalnızca `.pub` sunucuya eklenir.
3. GitHub’da **`VPS_SSH_KEY` repository secret’ını** yeni private key ile güncelleyin; Variable’daki anahtarı **silin**.

## İsimler (büyük/küçük harf dahil)

| İsim          | Zorunlu | Not                                      |
|---------------|---------|------------------------------------------|
| `VPS_HOST`    | Evet    | Örn. `76.13.14.43`                       |
| `VPS_USER`    | Evet    | Örn. `deploy`                            |
| `VPS_SSH_KEY` | Evet    | Private key blok (**Secret**)            |
| `VPS_PORT`    | Hayır   | Yoksa workflow **22** kullanır           |

Fork’ta iş akışı çalışıyorsa Secrets/Variables **fork repoda** tanımlanmalıdır.

## Required naming (English reference)

| Name          | Example     | Notes |
|---------------|-------------|--------|
| `VPS_HOST`    | `76.13.14.43` | Public IPv4 |
| `VPS_USER`    | `deploy`    | UNIX user |
| `VPS_PORT`    | `22`        | Optional |
| `VPS_SSH_KEY` | PEM / OpenSSH private key | Repository **Secret**, not plaintext in repo |

Eksik değişkenler **`Verify deploy`** adımında hata üretir; boş **`VPS_PORT`** eskiden **`Bad port ''`** verirdi (şimdi fallback 22).

```bash
ssh ... 'cd /var/www/pastane-app/app && ./deploy.sh'
```

## VPS prerequisites before Actions succeed

1. Repo cloned at `/var/www/pastane-app/app` with `origin` pointing at GitHub.
2. `./deploy.sh` executable; `deploy` user in `docker` group.
3. `/var/www/pastane-app/app/.env.production` present (`chmod 600`), no `change_me` / `placeholder`.
4. **Host nginx** terminating TLS and proxying to `127.0.0.1:3000/3001/3002/3003` (and MinIO `:9000` if `storage.*` is used).

The workflow does **not** run lint/test in CI; validation is `./deploy.sh` on the VPS (compose config, build, migrate deploy).

## Local developer — push + SSH deploy

Script: [`scripts/deploy-vps.sh`](../scripts/deploy-vps.sh)

1. One-time: copy [`scripts/deploy-vps.env.example`](../scripts/deploy-vps.env.example) to `scripts/deploy-vps.env.local`, set `VPS_HOST` (and optionally `VPS_USER`, `VPS_PORT`, `VPS_APP_DIR`, `VPS_SSH_IDENTITY`). Git ignores `scripts/deploy-vps.env.local` (see root `.gitignore`).
2. Ensure your SSH key can log in as `deploy@VPS_HOST` (agent or `VPS_SSH_IDENTITY`).
3. Run from repo root:

```bash
./scripts/deploy-vps.sh --dry-run --skip-checks   # commands only
./scripts/deploy-vps.sh                             # typecheck, push main, then remote ./deploy.sh
./scripts/deploy-vps.sh --push-only               # only push (let GitHub Actions deploy)
./scripts/deploy-vps.sh --remote-only             # only SSH deploy (after code is already on origin)
```

Uncommitted changes abort the script unless you pass `--allow-dirty`.
