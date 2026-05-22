# GitHub Actions — production deploy SSH

Workflow: [.github/workflows/deploy.yml](../.github/workflows/deploy.yml)

Trigger: push to `main`, or manual **workflow_dispatch**.

## Required secrets

| Secret | Example | Notes |
|--------|---------|--------|
| `VPS_HOST` | `76.13.14.43` | Public IPv4 of the VPS |
| `VPS_USER` | `deploy` | Non-root UNIX user that can run `docker` commands |
| `VPS_PORT` | `22` | SSH listener port |
| `VPS_SSH_KEY` | *(full PEM private key)* | Key for `deploy@VPS`; **never** committed to Git |

Deploy step:

```bash
ssh ... 'cd /var/www/pastane-app/app && ./deploy.sh'
```

## VPS prerequisites before Actions succeed

1. Repo cloned at `/var/www/pastane-app/app` with `origin` pointing at GitHub.
2. `./deploy.sh` executable; `deploy` user in `docker` group.
3. `/var/www/pastane-app/app/.env.production` present (`chmod 600`), no `change_me` / `placeholder`.
4. **Host nginx** terminating TLS and proxying to `127.0.0.1:3000/3001/3002/3003` (and MinIO `:9000` if `storage.*` is used).

The workflow does **not** run lint/test in CI; validation is `./deploy.sh` on the VPS (compose config, build, migrate deploy).
