# Local Detector & MCP Benchmark (`R-13` / #329)

Reproducible wall-time and output-token benchmark across **12 local HTML fixtures** (`packages/core/test/fixtures/pioneers/*.html` + representative fixtures from `packages/cli/test/fixtures/`), measured directly with `node scripts/bench-local.mjs` on real Playwright Chromium `158.0.8127.18` (`definitions@2026.11`).

## Summary (`docs/benchmarks/bench-results.tsv`)

| Tool | Format / Mode | Corpus (N) | Definitions | Chromium | Median Wall (ms) | p95 Wall (ms) | Harness RSS (MB) | Median Output (bytes) | Median Tokens (~B/4) | Tier Agreement |
| --- | --- | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `slop-detect-cli` | `json` | 12 | `2026.11` | `158.0.8127.18` | 1,459 | 1,481 | 91.0 | 34,610 | 8,653 | 100.0% |
| `slop-detect-cli` | `agent` | 12 | `2026.11` | `158.0.8127.18` | 1,463 | 1,531 | 83.6 | 127 | 32 | 100.0% |
| `slop-detect-cli` | `sarif` | 12 | `2026.11` | `158.0.8127.18` | 1,464 | 1,643 | 84.0 | 46,833 | 11,708 | 100.0% |
| `slop-detect-mcp` | `local-stdio` | 12 | `2026.11` | `158.0.8127.18` | 1,025 | 1,425 | 84.7 | 2,083 | 521 | 100.0% |

## Reproducing Locally

```bash
bun run build
node scripts/bench-local.mjs
```

## Key Measured Findings

1. **Agent-format compression:** `slop-detect --format agent` emits compact selector-addressed lines (`median 127 bytes`, ~32 tokens) versus `--format json` (`median 34,610 bytes`, ~8653 tokens) — a **272.5x** output reduction.
2. **CLI ↔ MCP determinism:** `slop-detect-mcp --local` (reusing a persistent stdio server process) achieved **100.0% tier agreement** with `slop-detect --format json` across all 12 fixtures.
3. **Zero fabricated third-party rows:** Only tools built and executed in this repository are measured here.
