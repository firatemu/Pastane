# GitHub Actions -> VPS SSH

Workflow: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)

Bu belge, GitHub Actions job'ının VPS'e nasıl bağlandığını ve hangi SSH ayarlarının zorunlu olduğunu özetler. Registry/image tarafı için ayrıca bkz. [github-actions-registry-deploy.md](./github-actions-registry-deploy.md).

## Gerekli Secrets / Variables

Workflow değerleri şu sırayla okur:

1. `secrets.NAME`
2. `vars.NAME`

Gerekli isimler:

| Name          | Required | Notes                                |
| ------------- | -------- | ------------------------------------ |
| `VPS_HOST`    | Yes      | Public IP veya DNS                   |
| `VPS_USER`    | Yes      | Genelde `deploy`                     |
| `VPS_SSH_KEY` | Yes      | Private key block, **Secret** olmalı |
| `VPS_PORT`    | No       | Varsayılan `22`                      |

`VPS_SSH_KEY` yalnızca **Secret** olarak saklanmalıdır; Variable içine private key koymayın.

## GitHub Environment

Workflow varsayılan olarak `environment: production` altında çalışır. Environment adınız farklıysa repository variable olarak:

```text
PASTANE_GITHUB_ENVIRONMENT=<your-environment-name>
```

tanımlayın.

## VPS önkoşulları

Sunucuda en az şu hazırlıklar tamamlanmış olmalı:

1. Repo `/var/www/pastane-app/app` altında klonlu ve `origin` GitHub repo'sunu gösteriyor olmalı.
2. `deploy` kullanıcısı `docker` grubunda olmalı.
3. `./deploy.sh` executable olmalı.
4. `.env.production` mevcut olmalı, placeholder içermemeli, `chmod 600` ile korunmalı olmalı.
5. Host Nginx `127.0.0.1:3000/3001/3002/3003` (ve gerekiyorsa MinIO `127.0.0.1:9000`) üzerine proxy yapmalı.

## Workflow'un SSH ile çalıştırdığı komut

Workflow VPS'te `./deploy.sh` çağırırken şu değişkenleri de geçirir:

- `DEPLOY_GIT_REF`
- `REGISTRY`
- `REGISTRY_SERVER`
- `IMAGE_TAG`

Bu sayede VPS doğru commit'teki ops script'lerini kullanır ve doğru image tag'ini pull eder.

## Anahtar rotasyonu

Eğer private key yanlış yerde paylaşıldıysa:

1. Sunucudaki eşleşen public key'i `authorized_keys` içinden kaldırın.
2. Yeni anahtar çifti üretin.
3. GitHub'daki `VPS_SSH_KEY` secret'ını yeni private key ile güncelleyin.

## Yerel manuel SSH fallback

Varsayılan deploy yolu artık `pnpm push:vps` -> GitHub Actions'tır. Yine de manuel SSH fallback için:

```bash
cp scripts/deploy-vps.env.example scripts/deploy-vps.env.local
chmod 600 scripts/deploy-vps.env.local
./scripts/deploy-vps.sh --remote-only --dry-run
./scripts/deploy-vps.sh --remote-only
```

İsterseniz local ortamdan şu değerleri de forward edebilirsiniz:

```bash
DEPLOY_GIT_REF=<sha-or-branch> IMAGE_TAG=<tag> REGISTRY=ghcr.io/<owner> ./scripts/deploy-vps.sh --remote-only
```
