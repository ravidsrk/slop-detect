# Slop Detector Native Rust Engine (`crates/`)

The Cargo workspace at the repository root compiles a single static binary (`slop-detect`) and a zero-glue WebAssembly module (`slop_wasm.wasm`) from one pure rule core (`crates/slop-core`).

## Crate Layout

```text
Cargo.toml                 Workspace + release profile (opt-level=3, fat LTO, stripped)
ENGINE_VERSION             Pinned native engine release tag version
rust-toolchain.toml        Stable Rust + wasm32-unknown-unknown target
spec/oracle/vectors.json   Frozen JSON parity oracle exported from @slop-detect/core
browser-bundle/            Standalone DOM probes embedded via include_str!
crates/
  slop-core       Pure zero-I/O engine (CSS Color 4 + Oklab ΔE, 45 design patterns +
                  all 4 POST_PASS_RULES, 26 copy patterns + paste artifacts, DESIGN.md
                  & DTCG 2025.10 lint/diff/compliance, craft floor, RFC 9309 robots.txt
                  & AEO parsers). Verified against spec/oracle/vectors.json.
  slop-static     Sub-20ms source & repo auditor (DESIGN.md lint, Oklab color drift,
                  chatbot paste artifacts, inline slop-ignore waivers, file:line:col spans).
  slop-aeo        Native HTTP/TLS AEO eligibility runner (zero Node, zero Chromium).
  slop-browser    Zero-Playwright Chrome/Chromium/Edge/Brave auto-discovery + raw CDP
                  client over tungstenite WebSockets + embedded browser-bundle probes.
  slop-hook       Sub-15ms coding-agent PostToolUse / Stop hook handler.
  slop-mcp        Native offline stdio JSON-RPC 2.0 MCP server (`slop-detect mcp`).
  slop-wasm       wasm32-unknown-unknown cdylib/rlib with linear-memory JSON ABI
                  for Cloudflare Workers, browsers, and IDE extensions.
  slop-cli        Single native binary (`slop-detect`) routing check/scan/aeo/design/hook/mcp/doctor.
```

## Build & Verify

```bash
# Regenerate oracle vectors & browser probe bundle after changing @slop-detect/core
bun run oracle:generate
bun run probe:build

# Test Rust workspace (including full oracle parity suite)
bun run rust:test

# Build optimized native binary (target/release/slop-detect)
bun run rust:build

# Build & verify wasm32-unknown-unknown module directly in Node
bun run rust:wasm
```

## Native CLI Examples

```bash
./target/release/slop-detect doctor
./target/release/slop-detect check . --format agent
./target/release/slop-detect design lint ./DESIGN.md
./target/release/slop-detect design diff ./base-DESIGN.md ./head-DESIGN.md --fail-on-breaking
./target/release/slop-detect scan http://127.0.0.1:8765/clean-artisan.html --copy --craft --format agent
./target/release/slop-detect aeo https://slop-detect.com --format agent
./target/release/slop-detect mcp
```

## Release Pipeline

Tagging `engine-vX.Y.Z` triggers `.github/workflows/release-engine.yml`, which compiles all 5 static native targets (`darwin-arm64`, `darwin-x64`, `linux-arm64`, `linux-x64`, `windows-x64.exe`) plus `slop_wasm.wasm`, generates SHA-256 checksums (`engine-checksums.txt`), and publishes the GitHub Release consumed by `skills/slop-detect/scripts/slop-detect`.
