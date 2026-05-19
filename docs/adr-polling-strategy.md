# ADR: Polling for admin, courier, and customer live updates

## Status

Accepted (operations and product).

## Context

The Pastane Platform surfaces **admin**, **courier**, and **customer web** flows that need reasonably fresh data (orders, deliveries, tracking). Real-time push (WebSockets or SSE) is not required for the current **single-tenant bakery** scale and operational model.

## Decision

Use **HTTP polling** for live-ish updates (lists, dashboards, tracking) instead of WebSockets for the **current** architecture.

## Rationale

- **Operational simplicity:** fewer long-lived connections, simpler Nginx and firewall rules, easier load balancing on a single ingress.  
- **Debugging:** standard request/response logs and traces.  
- **Adequate for MVP assumptions:** acceptable latency for order and courier workflows at expected concurrency on a **single-server** or small VPS footprint.  
- **Aligns with documented agent rules:** no optimistic updates on critical mutations; clients refetch **authoritative** state after actions.

## Consequences

- **Higher request volume** at scale than push models; monitor **API rate** and **polling intervals**.  
- **Latency** is bounded by poll interval, not server push.  
- Nginx configuration does **not** require WebSocket **Upgrade** headers for current features. If a future phase adds push, Nginx examples can add `map $http_upgrade` / `proxy_set_header Upgrade` for the relevant paths.

## Future options

If traffic or UX requires sub-second updates globally, reconsider:

- **WebSockets** for targeted channels (e.g. courier assignment), or  
- **SSE** for one-way server events,

with explicit auth, rate limits, and backoff. Document any migration in a new ADR.

See [nginx-production-example.md](nginx-production-example.md) and [production-risk-review.md](production-risk-review.md).
