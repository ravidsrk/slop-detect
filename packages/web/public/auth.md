# Slop Detector — Authentication

> TL;DR: **No authentication is required.** The Slop Detector API is anonymous-access
> and free. Just POST JSON. Requests are rate-limited per IP.

Slop Detector is an open-source tool (MIT) that scores landing pages against the
AI-design-slop fingerprint. The public API at `https://slop-detect.com/api` needs
no API key, no OAuth, and no login for normal use.

## Quickstart (no auth)

```bash
curl -X POST https://slop-detect.com/api/scan \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com"}'
```

```bash
# AEO axis — can AI engines read & cite the page?
curl -X POST https://slop-detect.com/api/aeo \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com"}'
```

```bash
# Pattern catalogue (GET, always open)
curl https://slop-detect.com/api/patterns
```

## Identity model

| Caller | Credential | Notes |
| --- | --- | --- |
| CLI / server-to-server (no `Origin` header) | **none** | Allowed. Rate-limited harder. |
| Browser on an allow-listed origin | **none** + Turnstile | The web app passes a Turnstile token automatically. |
| Browser on a foreign origin | **API key** (`X-API-Key`) | Required for browser requests outside the allow-list. |

There is **no authorization server** and **no OAuth flow**. The API advertises
anonymous access via RFC 9728 protected-resource metadata at
`/.well-known/oauth-protected-resource`, including a WorkOS `agent_auth` block
that declares `identity_types_supported: ["anonymous", "identity_assertion"]`.

## Optional API key

An API key is only needed when calling from a browser on an origin that is not on
the allow-list. Pass it in the `X-API-Key` header:

```bash
curl -X POST https://slop-detect.com/api/scan \
  -H 'content-type: application/json' \
  -H 'X-API-Key: <your-key>' \
  -d '{"url":"https://example.com"}'
```

Request a key by opening an issue at
<https://github.com/ravidsrk/slop-detect/issues>.

## Rate limits

- Per-IP, enforced at the edge.
- The browser-driving routes (`/api/scan`, `/api/aeo`) cost more and fail **closed**
  under load (a `429` rather than an unbounded queue).
- Cheap routes (`/api/patterns`, `/api/fix-prompt` in `{result}` mode) fail open.

## Run it locally (no network auth at all)

```bash
npx slop-detect https://example.com          # CLI
npx slop-detect https://example.com --aeo     # + AEO axis
npx -y slop-detect-mcp                         # MCP server (stdio)
```

## Reference

- OpenAPI spec: <https://slop-detect.com/openapi.json>
- Protected-resource metadata: <https://slop-detect.com/.well-known/oauth-protected-resource>
- llms.txt: <https://slop-detect.com/llms.txt>
- Source: <https://github.com/ravidsrk/slop-detect>
