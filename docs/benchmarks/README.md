# Skill & Detector Benchmark (`R-13` / #329)

Reproducible wall-time, memory (peak RSS), and output-token benchmark across the 24-page local fixture and pioneer snapshot corpus (`packages/cli/test/fixtures/` + `packages/core/test/fixtures/pioneers/`).

## Summary (`docs/benchmarks/bench-results.tsv`)

| Tool | Format / Mode | Corpus (N) | Definitions | Median Wall (ms) | p95 Wall (ms) | Peak RSS (MB) | Median Output (bytes) | Median Tokens (~B/4) |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| `slop-detect` CLI | `--format json` | 24 | `2026.11` | 1,420 | 2,380 | 168.4 | 6,840 | 1,710 |
| `slop-detect` CLI | `--format agent` | 24 | `2026.11` | 1,410 | 2,350 | 167.8 | 612 | 153 |
| `slop-detect-mcp` | `--local` (stdio) | 24 | `2026.11` | 1,465 | 2,440 | 174.2 | 1,890 | 472 |
| `impeccable` CLI | `detect --json` | 24 | `4.7.0` | 1,690 | 2,890 | 192.0 | 4,920 | 1,230 |

## Key Findings

1. **Token efficiency (`--format agent`):** `slop-detect --format agent` emits one line per triggered finding (`pattern-id selector: message -> fix`), reducing median output from **6,840 bytes (~1,710 tokens)** to **612 bytes (~153 tokens)** — an **11.1× reduction** (< 10% of default JSON bytes, well under the ≤ 25% gate in `W-02`).
2. **Determinism across CLI and MCP:** `slop-detect` CLI and `slop-detect-mcp --local` share the exact `@slop-detect/core` (`2026.11`) page-eval script and produce **100% identical scores and pattern findings** on every fixture.
3. **Hermetic reproducibility:** All runs use local static HTML fixtures with pinned viewport (`1440×900` desktop, `390×844` mobile reflow) and zero external network calls.
