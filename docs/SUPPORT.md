# SUPPORT.md — how to get help (G-41, G-57)

Support is **GitHub issues only**. There is no helpdesk, no support email,
no SLA, and no private support channel — one maintainer, best effort, in
the open. This is the documented model (G-57 ACCEPT), not a gap.

## Where to go

| Need | Where | Notes |
|---|---|---|
| Bug: wrong score, missed pattern | [bug report](https://github.com/ravidsrk/slop-detect/issues/new?template=bug_report.md) | Include the scanned URL + sanitized JSON output (see below) |
| New pattern proposal | [new pattern](https://github.com/ravidsrk/slop-detect/issues/new?template=new_pattern.md) | Show 3+ real-world sightings |
| Fix recipe for a pattern | [fix recipe](https://github.com/ravidsrk/slop-detect/issues/new?template=fix_recipe.md) | Before/after CSS or copy |
| Delete my data / remove a scan result | [new issue](https://github.com/ravidsrk/slop-detect/issues/new) | Or self-serve: `/api/me/export`, `/api/me/erase` (see [privacy.md](https://slop-detect.com/privacy.md)) |
| Security vulnerability | **Private vulnerability reporting**, not a public issue | See `docs/SECURITY.md` + `/.well-known/security.txt` |
| Question / discussion | [new issue](https://github.com/ravidsrk/slop-detect/issues/new) | No Discussions tab; issues are the forum |

## What to expect

- Best-effort triage by the maintainer; bugs with a reproduction (URL +
  JSON output) go first. No response-time promise — if it's urgent,
  self-host: the engine is MIT and the runbooks are in `docs/`.
- Sanitize scan output before posting: scan JSON carries the full request
  and final URLs, page title/H1, and optionally a screenshot blob. Strip
  query strings and fragments from URLs (`?token=…`, `#…`), delete the
  `screenshot` field entirely, and keep score/patterns/version. If the URL
  itself is sensitive, reproduce against a public page with the same stack.
- Never post secrets in issues: no API keys, no `sd_session` cookies, no
  magic-link URLs. Treat a leaked session token as compromised — sign out
  everywhere and request a fresh link.
- Private pages: don't ask the maintainer to scan a URL behind auth. The
  CLI opens a fresh browser with no login, cookies, or headers, so it can
  only scan pages reachable without authentication — for authed pages,
  reproduce on a staging copy with no real user data, or self-host.

## Scope

Supported: the hosted scanner/API, the CLI, the MCP server, and the docs.
Best-effort: self-hosted installs (we'll read the issue, but your
infrastructure is yours). Out of scope: general web-design advice, SEO
consulting, and pre-audits of pages you don't own.
