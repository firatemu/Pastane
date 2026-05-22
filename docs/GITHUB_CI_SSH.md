# GitHub Actions — production deploy SSH

Workflow: [.github/workflows/deploy.yml](../.github/workflows/deploy.yml)

Trigger: push to `main`, or manual **workflow_dispatch**.

## Required secrets

| Secret | Example | Notes |
|--------|---------|--------|
| `VPS_HOST` | `76.13.14.43` | Public IPv4 of the VPS |
| `VPS_USER` | `deploy` | Non-root UNIX user that can run `docker` commands |
| `VPS_PORT` | `22` | SSH listener port (**optional**: if omitted in GitHub, the workflow uses port `22`) |
| `VPS_SSH_KEY` | *(full PEM private key)* | Key for `deploy@VPS`; **never** committed to Git |

Secrets must live under **Repository → Settings → Secrets and variables → Actions** (exact names above). Empty secrets produce errors like **`Bad port ''`** or **`Verify deploy secrets`** failing in CI.


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
