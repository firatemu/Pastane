# Monitoring and observability

Operational monitoring for the Pastane Docker Compose deployment on Ubuntu 24.04 LTS.

**Related:** [OPERATIONS.md](OPERATIONS.md), [backup-and-restore.md](backup-and-restore.md).

## Health checks

**Application**

- **Endpoint:** `GET /api/v1/health`  
- **Response:** JSON with `status` (`ok` | `degraded`) and `services.postgres`, `redis`, `minio` booleans.

Use from **load balancer**, **Uptime Kuma**, or **cron + curl** on a jump host.

**Containers**

- `docker compose -f docker/docker-compose.prod.yml --env-file .env.prod ps`  
- Docker **`healthcheck`** states in Compose for postgres, redis, minio, api.

## Log strategy

### Container logs

Production Compose sets the **`json-file`** logging driver with **rotation**:

```yaml
logging:
  driver: json-file
  options:
    max-size: "10m"
    max-file: "5"
```

**Why rotation matters**

- Without **`max-size`** / **`max-file`**, logs grow until the **root filesystem fills**.  
- Full disks cause **cascading failures** (PostgreSQL, writes, container starts).  
- Huge log files slow **incident triage**.

Rough upper bound per service with the example above: about **50 MB** of retained Docker log files per container (tune per compliance).

### Application logs

- Ensure the API does **not** log secrets, tokens, OTPs, payment payloads, or card data (see project security rules).  
- Use structured log lines where possible (timestamp, level, request id).

### Centralized logs (optional)

For multi-node or heavier operations: **Vector**, **Fluent Bit**, **Loki**, or managed logging. Out of scope for default single-server Compose; mention in runbook when adopted.

## Container and host monitoring

| Signal | Tool / action |
|--------|----------------|
| CPU / RAM | `docker stats`, host `htop`, Grafana Agent, cloud metrics |
| Disk | `df -h`, Docker volume usage, alerts at 80%/90% |
| Docker daemon | `systemctl status docker` |

## Optional: Sentry

- **API:** `@sentry/node` (or Nest integration) with DSN from env.  
- **Next.js:** Sentry SDK for web/admin/courier with separate projects or environments.

**Staging vs production:** use separate Sentry **environment** tags.

## Optional: Uptime Kuma

Self-hosted HTTP checks against:

- `https://<public-host>/api/v1/health`  
- Optional: home page 200 for web

Notify via email/Slack/webhook.

## Disk usage monitoring

Priority paths:

- Docker **root** (`/var/lib/docker`)  
- PostgreSQL volume  
- MinIO volume  
- **`BACKUP_DIR`**

Alert **before** exhaustion; include **growth trend** if possible.

## Alert recommendations

- Health check **fails** 3+ consecutive times  
- Disk **> 80%** on any critical volume  
- Backup job **fails** or **skips**  
- Nginx **5xx** rate spike (if access logs are aggregated)  
- Redis/Postgres container **unhealthy**

## Polling load note

The platform uses **HTTP polling** for several UIs ([adr-polling-strategy.md](adr-polling-strategy.md)). During incidents, watch **request rate** to `/api/v1` from authenticated surfaces.
