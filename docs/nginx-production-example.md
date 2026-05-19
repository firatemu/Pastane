# Nginx production examples (placeholders only)

This file documents **example** reverse proxy patterns for the Pastane stack. **Do not** copy TLS certificate paths blindly—generate real certs for production or use mkcert/staging certs for lab.

**Related:** [production-deployment-plan.md](production-deployment-plan.md), [production-checklist.md](production-checklist.md), [adr-polling-strategy.md](adr-polling-strategy.md).

## Upstream layout (Docker internal DNS)

In [docker-compose.prod.yml](../docker/docker-compose.prod.yml), service names resolve on the **`pastane_internal`** network:

| Upstream   | Port | Role        |
|-----------|------|-------------|
| `web`     | 3000 | Customer web |
| `admin`   | 3001 | Admin        |
| `courier` | 3002 | Courier      |
| `api`     | 3003 | NestJS API   |
| `minio`   | 9000 | S3 API       |

Nginx runs **on the same network** and proxies to these names.

## Rate limiting (auth vs general API)

Map and zone example:

```nginx
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
```

Apply **`auth_limit`** to **`location`** blocks that match `/api/v1/auth` (exact paths depend on your `location` nesting). Apply **`api_limit`** to the rest of the API. Tune for your traffic.

## Forwarded headers (trust)

Behind Nginx, NestJS and Next need correct **`X-Forwarded-Proto`** and **`X-Forwarded-Host`** for redirects and optional URL generation.

Example:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;
```

Configure **`real_ip`** / **`set_real_ip_from`** if you add another CDN or load balancer in front.

## Client body size (uploads)

Align **`client_max_body_size`** with the API’s Multer/media limits. The base [docker/nginx/nginx.conf](../docker/nginx/nginx.conf) sets **20M**; adjust globally or per `location` for `/api/v1/media` (or your upload routes).

**Goal:** reject oversize payloads at Nginx **and** validate MIME/size in the API.

## CORS

Prefer **same-origin** browser access: web → Next BFF routes under `/app/api` that call the API server-side. If the browser must call the API cross-origin:

- Use an **explicit allowlist** of origins (`https://staging.local`, production web origin).  
- Never use `Access-Control-Allow-Origin: *` with **credentials**.

## WebSockets

Current product uses **polling** ([adr-polling-strategy.md](adr-polling-strategy.md)). No WebSocket **`Upgrade`** block is required today.

Optional future snippet:

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

## Staging with `/etc/hosts`

Map to the Nginx host IP (often `127.0.0.1` for local staging):

```
127.0.0.1 staging.local api.staging.local admin.staging.local courier.staging.local storage.staging.local
```

Use **HTTPS** on these names so **`Secure`** cookies (Next.js `NODE_ENV === 'production'`) behave like production.

## Full example file

A **worked** `server` / `upstream` example lives in [docker/nginx/conf.d/pastane.conf](../docker/nginx/conf.d/pastane.conf). An identical copy is kept as [docker/nginx/conf.d/pastane.conf.example](../docker/nginx/conf.d/pastane.conf.example) for customization workflows. Only `*.conf` files are included by [docker/nginx/nginx.conf](../docker/nginx/nginx.conf).

## Security headers

- Baseline headers are in [docker/nginx/nginx.conf](../docker/nginx/nginx.conf).  
- Add **Strict-Transport-Security** only when HTTPS is end-to-end and stable:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

## Future production domain mapping (comment pattern)

When DNS exists, typical mapping (illustrative—**not** configured yet in this project):

| Public host              | Upstream   |
|--------------------------|------------|
| `pastane.com`            | `web:3000` |
| `api.pastane.com`        | `api:3003` |
| `admin.pastane.com`      | `admin:3001` |
| `courier.pastane.com`    | `courier:3002` |
| `storage.pastane.com`    | `minio:9000` |

Replace with your real domain policy when assigned.
