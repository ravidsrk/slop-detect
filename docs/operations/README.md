# Self-Hosting & Production Operations (`slop-detect.com`)

This directory contains the operational runbooks, architecture decisions, KV schemas, and security controls for running the `apps/web` Cloudflare Pages application in staging and production.

> Looking for developer usage docs (CLI, MCP, CI/CD, `DESIGN.md`, AEO, SDK)? Go up to [**`docs/README.md`**](../README.md).

---

## Operations Index

| Document | Purpose |
| --- | --- |
| [**`PRODUCTION.md`**](./PRODUCTION.md) | Production launch checklist, required Cloudflare Pages bindings (`BROWSER`, `RESULTS`, `RATE_LIMIT`), and secrets table |
| [**`RUNBOOKS.md`**](./RUNBOOKS.md) | Top-5 incident response runbooks (`RB-1` through `RB-5`) and incident 3-liner template |
| [**`ALERTS.md`**](./ALERTS.md) | Structured `report()` event catalogue, severity levels, and webhook alerting |
| [**`STAGING.md`**](./STAGING.md) | Preview vs. production environment isolation and KV namespace interlocks |
| [**`ROLLBACK.md`**](./ROLLBACK.md) | Cloudflare Pages & npm rollback procedures and rehearsal verification |
| [**`RECOVERY.md`**](./RECOVERY.md) | KV store inventory, blast-radius table, and data recovery procedures |
| [**`CAPACITY.md`**](./CAPACITY.md) | Edge execution budgets, Browser Rendering timeouts, and daily scan caps |
| [**`REHEARSAL.md`**](./REHEARSAL.md) | End-to-end `s4` stranger-test suite (`bun run s4 -- --target <url>`) |
| [**`KV_TTL.md`**](./KV_TTL.md) | Key prefix registry (`r:`, `d:`, `h:`, `w:`, `og:`, `key:`, `rl:`) and TTL contract |
| [**`KV_BACKUP.md`**](./KV_BACKUP.md) | Automated KV backup and point-in-time restore procedures |
| [**`KV_LIMITS.md`**](./KV_LIMITS.md) | KV counter atomicity, rate-limit window bounds, and storage ceilings |
| [**`EMAIL.md`**](./EMAIL.md) | Transactional email compliance (CAN-SPAM, RFC 8058 one-click unsubscribe, bounce webhooks) |
| [**`EMAIL_AUTH.md`**](./EMAIL_AUTH.md) | SPF, DKIM, and DMARC DNS verification procedure for `slop-detect.com` |
| [**`AUTHZ_MATRIX.md`**](./AUTHZ_MATRIX.md) | Endpoint authorization matrix, rate-limit tiers, and secret scan controls |
| [**`MONITOR_SANDBOX.md`**](./MONITOR_SANDBOX.md) | Safe testing procedure for `/api/cron/sweep` domain regression alerts |
| [**`RETENTION.md`**](./RETENTION.md) | Data retention policy and self-serve GDPR/DPDP export (`/api/me/export`) & erasure (`/api/me/erase`) |
| [**`DECISIONS.md`**](./DECISIONS.md) | Historical architectural decision records (ADRs) |
