# S4 stranger test — critical-flow scripts (T-39)

Seven happy-path + failure-path scripts, one per critical flow, runnable by a
stranger with no repo knowledge against any deployment target:

| Script            | Flow                                | Needs secrets? |
| ----------------- | ----------------------------------- | -------------- |
| `cf01-webscan.ts` | Web scan + permalink + SSRF block    | no             |
| `cf02-cli.ts`     | CLI remote scan + `--fail-on` gate + usage error | no (spawns local `packages/cli` build) |
| `cf03-fixprompt.ts` | Fix prompt assembled + scanned modes | no           |
| `cf04-monitor.ts` | Watch register/unsubscribe + sweep  | confirm+alert SKIP (covered by `monitor-flow.test.js`) |
| `cf05-dashboard.ts` | Magic link + dashboard            | page + link steps SKIP on 503 fail-closed targets; full mint SKIPs (all covered by `dashboard.test.js`) |
| `cf06-mcp.ts`     | MCP tools/list + scan_page          | no (spawns local `packages/mcp` build) |
| `cf07-share.ts`   | /r /score /api/patterns /og card    | no             |

## Run

```bash
# against a preview deployment (builds the CLI + MCP bins first)
bun run s4 -- --target https://<preview>.pages.dev

# against production
bun run s4 -- --target https://slop-detect.com

# a single flow (--target/--only accept both `--flag value` and `--flag=value`)
bun run s4 -- --target <url> --only cf01
# or a single script directly (target via S4_BASE, default https://slop-detect.com):
S4_BASE=<url> bun scripts/s4/cf01-webscan.ts
```

The seed URL each flow scans defaults to the target's own homepage (always a
real, scannable landing page); override with `S4_SEED_URL=` if needed.
`example.com` is NOT a valid seed — the engine 422s it as an empty page.

Every script writes its steps to stdout and the runner writes the full report
to `scripts/s4/results.json` (overwritten each run, gitignored — evidence
lives in the S4 report, not the repo). Exit code is non-zero on any FAIL;
SKIP steps name the owner (step text + reason) so a stranger knows exactly
what was not exercised.

Scan-budget pacing is built in: no-origin callers get 3 scan-bucket hits per
60s, even 400s consume budget (the gate runs pre-validation), and each hit
resets the counter's TTL — so `lib.paceScan()` fires bursts of ≤3 with a full
61s+ idle between them, and the suite takes ~6 minutes. Wait 60s+ before
re-running the suite back-to-back.
