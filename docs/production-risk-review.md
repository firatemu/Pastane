# Production risk review

Living document for **deployment readiness** risks. Pair with [production-deployment-plan.md](production-deployment-plan.md).

## Current architecture risks

| Risk | Mitigation (documentation / ops) |
|------|----------------------------------|
| **Single server** — no HA | Backups, restore drills, sober RTO; scale-up or split DB later |
| **Secrets in env files** | `chmod 600`, no git, rotation runbook |
| **Cookie `Secure` + HTTP** | Use HTTPS everywhere for `NODE_ENV=production`; hosts-based staging |
| **Polling volume** | Monitor QPS; tune intervals; see [adr-polling-strategy.md](adr-polling-strategy.md) |
| **Image `latest` drift** | Pin **`IMAGE_TAG`** semver; document rollback |

## Staging limitations

- **Localhost-only** testing misses TLS, subdomain, and `Secure` cookie bugs.  
- **Hosts-file staging** (`staging.local`, etc.) reduces but may not match CDN or corporate proxy behavior.  
- **Iyzico sandbox** does not prove production payment edge cases.

## Localhost assumptions in repo

- [.env.example](../.env.example) uses **Docker service hostnames** (`postgres`, `redis`, `minio`) for API inside Compose.  
- **Browser** uses `localhost` ports or staging hostnames for Next apps.  
- **`NEXT_PUBLIC_*`** values are baked at **Next build time** in Docker—rebuild when public URLs change.

## Internal Docker networking

**PostgreSQL, Redis, and MinIO** must **not** be exposed on the public Internet. Production Compose uses **`expose`** and an **`internal`** Docker network for data-plane isolation; **only Nginx** publishes **80/443**. Misconfiguration (accidental `ports: 5432:5432`) is a **critical** finding—fix before go-live.

Verify externally with port scans or cloud security groups.

## External provider dependencies

| Provider | Risk |
|----------|------|
| **Iyzico** | Account, keys, callback URL must match **public** `API_URL` / bank config |
| **SMS / OTP** | `OTP_ACTIVE` and Netgsm (or other) credentials |
| **FCM** | Push not live until keys configured |
| **SMTP** | Email notifications |
| **DNS / TLS** | Real domains not assigned yet—**manual cutover** |

## Production unknowns (until cutover)

- Real traffic patterns and peak **orders/hour**  
- Actual **image upload** volume and MinIO growth  
- **Courier mobile** (future) may change client patterns  
- Compliance requirements (PCI scope, retention, audit logging)—legal review

## Scaling assumptions

- **MVP** sizing: see [production-checklist.md](production-checklist.md) (**4 vCPU / 8 GB / 120 GB** guideline).  
- Growth tier **8+ vCPU / 16+ GB** when admin concurrency and background jobs increase.  
- Vertical scale hits limits; horizontal scaling implies **load balancer**, **external managed DB**, **object storage**, and **session affinity** or shared state review.

## What still requires real production credentials / domains

- [ ] **DNS** A/AAAA for web, API, admin, courier, storage  
- [ ] **TLS** certificates for those names  
- [ ] **Iyzico** production API keys and **callback** URLs  
- [ ] **MinIO** public URL and bucket policy for browser-accessible assets  
- [ ] **SMTP**, **FCM**, **SMS** as features go live  
- [ ] **`WEB_URL`**, **`API_URL`**, **`ADMIN_URL`**, **`COURIER_URL`**, **`NEXT_PUBLIC_SITE_URL`** in `.env.prod` matching public URLs  
- [ ] Optional: **Sentry** DSN, **external** log sink

## Remediation tracking

| Item | Owner | Target date | Status |
|------|-------|-------------|--------|
| First staging deploy | | | |
| Production cutover | | | |
