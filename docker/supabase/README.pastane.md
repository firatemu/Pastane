# Pastane — Supabase self-hosted (production)

Pinned upstream: [supabase/supabase `docker/`](https://github.com/supabase/supabase/tree/master/docker) (vendored at Faz 8.0).

| Layer | File |
|-------|------|
| Base stack | `docker-compose.yml` |
| PostgreSQL 17 | `docker-compose.pg17.yml` |
| Pastane prod | `docker-compose.pastane.prod.yml` |

**Pin (images from base compose at vendoring):** Studio `supabase/studio:2026.04.27-sha-5f60601`, DB `supabase/postgres:17.6.1.084` (via pg17 override).

## Pastane-specific behaviour

- Docker project: `supabase-prod`
- Network: `pastane_supabase` (API connects via alias `supabase-db`)
- Studio: `127.0.0.1:54323` → https://studio.azem.cloud
- Kong / Supavisor: internal only (no host ports)
- Pastane app uses `pastane_db`; Supabase internal services use `postgres` DB (see `.env.production.example`)

## Upgrade upstream

1. Re-vendor `docker/` from a tagged Supabase release (do not blindly track `master`).
2. Test locally with Supabase CLI, then backup → pull → `up -d` → smoke ([`docs/OPERATIONS.md`](../../docs/OPERATIONS.md)).
3. Production: backup → `docker compose pull` → `up -d` → smoke.

## Generate runtime env

```bash
bash scripts/generate-supabase-compose-env.sh .env.production /tmp/supabase-runtime.env
```

Never commit `/tmp/supabase-runtime.env` or real secrets.
