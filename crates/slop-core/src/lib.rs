//! Pure, zero-I/O deterministic scoring engine for `slop-detect`.
//!
//! Compiles identically on native targets (CLI, MCP, hooks, raw CDP runner)
//! and `wasm32-unknown-unknown` (Cloudflare Workers, browser/IDE extensions).

pub mod aeo;
pub mod color;
pub mod copy;
pub mod craft;
pub mod design;
pub mod design_md;
pub mod fixes;
pub mod verdict;

pub const DEFINITIONS_VERSION: &str = "2026.11";
pub const ENGINE_VERSION: &str = env!("CARGO_PKG_VERSION");
pub const SCAN_SCHEMA_VERSION: u32 = 1;
pub const AEO_SCANNER_USER_AGENT: &str = "SlopDetector-AEO/1.0 (+https://slop-detect.com/bot)";
