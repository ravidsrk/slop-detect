//! Native zero-Node stdio JSON-RPC 2.0 MCP server for `slop-detect`.
//!
//! Runs completely offline by default using `slop-browser` (raw CDP),
//! `slop-aeo` (native HTTP), and `slop-static` (<15ms source/token linting).

use serde_json::{json, Value};
use slop_aeo::run_aeo_audit;
use slop_browser::{scan_url_cdp, BrowserScanOptions};
use slop_core::design::DESIGN_PATTERNS;
use slop_core::design_md::{diff_design_md, lint_design_md};
use slop_core::{DEFINITIONS_VERSION, ENGINE_VERSION};
use slop_static::{check_path, StaticCheckOptions};
use std::fs;
use std::io::{self, BufRead, Write};
use std::path::PathBuf;

fn tool_definitions() -> Value {
    json!([
        {
            "name": "scan_page",
            "title": "Scan Page for Default-Template Patterns (Native CDP)",
            "description": "Score a landing page offline via native Chrome CDP across Design (45 patterns), Copy (26 patterns), Craft floor, and optional DESIGN.md compliance. Lower design/copy scores are better (Clean 0-9, Mild 10-27, Heavy 28+).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "url": { "type": "string", "description": "http://, https://, or file:// URL to scan." },
                    "axes": {
                        "type": "array",
                        "items": { "type": "string", "enum": ["design", "copy", "craft"] },
                        "description": "Axes to score (default: [\"design\"])."
                    },
                    "design_md_path": { "type": "string", "description": "Optional local path to DESIGN.md or tokens.json." }
                },
                "required": ["url"],
                "additionalProperties": false
            }
        },
        {
            "name": "check_static",
            "title": "Static Source, DESIGN.md & Paste-Artifact Check",
            "description": "Sub-20ms static check over a local file or directory for DESIGN.md lint errors, hardcoded off-palette colors (Oklab ΔE), and zero-taste chatbot paste artifacts.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "path": { "type": "string", "description": "File or directory path to check (default: \".\")." },
                    "design_md_path": { "type": "string", "description": "Optional DESIGN.md / tokens.json path." },
                    "check_colors": { "type": "boolean", "description": "Check hardcoded CSS/JSX colors against DESIGN.md palette (default: true)." }
                },
                "required": [],
                "additionalProperties": false
            }
        },
        {
            "name": "check_aeo",
            "title": "Check AEO Crawler & Citation Eligibility",
            "description": "Check technical AEO eligibility over native HTTP (no browser): reachability, edge access, RFC 9309 robots.txt, indexability, preview directives, server-rendered text, Markdown twin, /llms.txt, and prompt-injection checks. Higher score is better (0-100).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "url": { "type": "string", "description": "http:// or https:// URL to check." }
                },
                "required": ["url"],
                "additionalProperties": false
            }
        },
        {
            "name": "lint_design_md",
            "title": "Lint a DESIGN.md File",
            "description": "Statically lint DESIGN.md text offline: broken token refs, circular aliases, component WCAG contrast <4.5:1, orphaned palette tokens, and specVersion.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "design_md": { "type": "string", "description": "Full DESIGN.md markdown/frontmatter text." }
                },
                "required": ["design_md"],
                "additionalProperties": false
            }
        },
        {
            "name": "diff_design_md",
            "title": "Diff Two DESIGN.md Files",
            "description": "Compare two DESIGN.md documents token-by-token and flag breaking removals or value changes.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "base_design_md": { "type": "string" },
                    "head_design_md": { "type": "string" }
                },
                "required": ["base_design_md", "head_design_md"],
                "additionalProperties": false
            }
        }
    ])
}

pub fn handle_rpc_request(req: &Value) -> Option<Value> {
    let method = req.get("method").and_then(|v| v.as_str()).unwrap_or("");
    let id = req.get("id").cloned();

    // JSON-RPC notifications have no id -> no reply
    if id.is_none() || method.starts_with("notifications/") {
        return None;
    }
    let id = id.unwrap();

    let result = match method {
        "initialize" => Ok(json!({
            "protocolVersion": "2025-03-26",
            "capabilities": {
                "tools": { "listChanged": false },
                "resources": { "listChanged": false }
            },
            "serverInfo": {
                "name": "slop-detect-native",
                "version": ENGINE_VERSION
            },
            "instructions": "Native offline Rust MCP server for slop-detect. Use check_static (<20ms) while editing files, scan_page (native Chrome CDP) to verify rendered UI, check_aeo for technical crawler eligibility, and lint_design_md / diff_design_md for design token governance."
        })),
        "ping" => Ok(json!({})),
        "tools/list" => Ok(json!({ "tools": tool_definitions() })),
        "resources/list" => Ok(json!({
            "resources": [
                {
                    "uri": "slop://spec/patterns",
                    "name": "Slop Detector Pattern Catalogue",
                    "mimeType": "application/json",
                    "description": "Live pattern counts, weights, and lifecycle statuses from slop-core."
                }
            ]
        })),
        "resources/read" => {
            let uri = req
                .pointer("/params/uri")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            if uri == "slop://spec/patterns" {
                let items: Vec<Value> = DESIGN_PATTERNS
                    .iter()
                    .map(|p| {
                        json!({
                            "id": p.id,
                            "label": p.label,
                            "weight": p.weight,
                            "status": p.status,
                            "category": p.category
                        })
                    })
                    .collect();
                let body = json!({
                    "definitionsVersion": DEFINITIONS_VERSION,
                    "engineVersion": ENGINE_VERSION,
                    "designPatternCount": DESIGN_PATTERNS.len(),
                    "designPatterns": items
                })
                .to_string();
                Ok(json!({
                    "contents": [{ "uri": uri, "mimeType": "application/json", "text": body }]
                }))
            } else {
                Err((-32602, format!("unknown resource URI: {}", uri)))
            }
        }
        "tools/call" => {
            let name = req
                .pointer("/params/name")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let args = req
                .pointer("/params/arguments")
                .cloned()
                .unwrap_or_else(|| json!({}));
            Ok(execute_tool(name, &args))
        }
        _ => Err((-32601, format!("method not found: {}", method))),
    };

    match result {
        Ok(res) => Some(json!({ "jsonrpc": "2.0", "id": id, "result": res })),
        Err((code, msg)) => Some(json!({
            "jsonrpc": "2.0",
            "id": id,
            "error": { "code": code, "message": msg }
        })),
    }
}

fn execute_tool(name: &str, args: &Value) -> Value {
    match name {
        "lint_design_md" => {
            let text = args
                .get("design_md")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let res = lint_design_md(text);
            let txt = format!(
                "DESIGN.md lint: {} ({} error(s), {} warning(s), specVersion={})",
                if res.valid { "VALID" } else { "INVALID" },
                res.errors.len(),
                res.warnings.len(),
                res.spec_version
            );
            json!({
                "content": [{ "type": "text", "text": txt }],
                "structuredContent": res,
                "isError": false
            })
        }
        "diff_design_md" => {
            let base = args
                .get("base_design_md")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let head = args
                .get("head_design_md")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let res = diff_design_md(base, head);
            let txt = format!(
                "DESIGN.md diff: breaking={}, +{} added, -{} removed, ~{} changed",
                res.breaking,
                res.added.len(),
                res.removed.len(),
                res.changed.len()
            );
            json!({
                "content": [{ "type": "text", "text": txt }],
                "structuredContent": res,
                "isError": false
            })
        }
        "check_static" => {
            let path = PathBuf::from(args.get("path").and_then(|v| v.as_str()).unwrap_or("."));
            let design_md = args
                .get("design_md_path")
                .and_then(|v| v.as_str())
                .map(PathBuf::from);
            let check_colors = args
                .get("check_colors")
                .and_then(|v| v.as_bool())
                .unwrap_or(true);
            let report = check_path(
                &path,
                &StaticCheckOptions {
                    design_md,
                    check_colors,
                    max_files: 1000,
                },
            );
            let txt = format!(
                "Static check on {}: {} files, {} error(s), {} warning(s) ({} ms)",
                report.root, report.files_scanned, report.errors, report.warnings, report.elapsed_ms
            );
            json!({
                "content": [{ "type": "text", "text": txt }],
                "structuredContent": report,
                "isError": false
            })
        }
        "check_aeo" => {
            let url = args.get("url").and_then(|v| v.as_str()).unwrap_or("");
            match run_aeo_audit(url, 15) {
                Ok(report) => {
                    let txt = format!(
                        "AEO {}: {}/100 ({}) in {} ms",
                        report.url, report.score, report.tier, report.elapsed_ms
                    );
                    json!({
                        "content": [{ "type": "text", "text": txt }],
                        "structuredContent": report,
                        "isError": false
                    })
                }
                Err(e) => json!({
                    "content": [{ "type": "text", "text": format!("AEO check failed: {}", e) }],
                    "isError": true
                }),
            }
        }
        "scan_page" => {
            let url = args.get("url").and_then(|v| v.as_str()).unwrap_or("");
            let axes: Vec<String> = args
                .get("axes")
                .and_then(|v| v.as_array())
                .map(|a| {
                    a.iter()
                        .filter_map(|x| x.as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_else(|| vec!["design".to_string()]);
            let design_md_text = args
                .get("design_md_path")
                .and_then(|v| v.as_str())
                .and_then(|p| fs::read_to_string(p).ok());
            let opts = BrowserScanOptions {
                include_copy: axes.iter().any(|a| a == "copy"),
                include_craft: axes.iter().any(|a| a == "craft"),
                design_md_text,
                ..Default::default()
            };
            match scan_url_cdp(url, &opts) {
                Ok(res) => {
                    let triggered: Vec<&str> = res
                        .design
                        .patterns
                        .iter()
                        .filter(|p| p.triggered)
                        .map(|p| p.id.as_str())
                        .collect();
                    let txt = format!(
                        "{}: score={}/100 ({}, {}), flagged=[{}], {} ms (native CDP)",
                        res.url,
                        res.score,
                        res.tier,
                        res.grade,
                        triggered.join(", "),
                        res.elapsed_ms
                    );
                    json!({
                        "content": [{ "type": "text", "text": txt }],
                        "structuredContent": res,
                        "isError": false
                    })
                }
                Err(e) => json!({
                    "content": [{ "type": "text", "text": format!("Scan could not run (this is not a Clean score): {}", e) }],
                    "isError": true
                }),
            }
        }
        _ => json!({
            "content": [{ "type": "text", "text": format!("Unknown tool: {}", name) }],
            "isError": true
        }),
    }
}

pub fn serve_stdio() -> i32 {
    let stdin = io::stdin();
    let mut stdout = io::stdout();
    for line in stdin.lock().lines().map_while(Result::ok) {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        if let Ok(req) = serde_json::from_str::<Value>(trimmed) {
            if let Some(resp) = handle_rpc_request(&req) {
                let _ = writeln!(stdout, "{}", resp);
                let _ = stdout.flush();
            }
        }
    }
    0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mcp_initialize_tools_list_and_lint_roundtrip() {
        let init = handle_rpc_request(&json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {}
        }))
        .unwrap();
        assert_eq!(init["result"]["serverInfo"]["name"], "slop-detect-native");

        let list = handle_rpc_request(&json!({
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/list"
        }))
        .unwrap();
        let tools = list["result"]["tools"].as_array().unwrap();
        assert!(tools.len() >= 5);

        let call = handle_rpc_request(&json!({
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {
                "name": "lint_design_md",
                "arguments": {
                    "design_md": "---\nname: Demo\nspecVersion: alpha\ncolors:\n  bg: \"#F4F5F2\"\n  ink: \"#181815\"\ncomponents:\n  card:\n    backgroundColor: \"{colors.bg}\"\n    textColor: \"{colors.ink}\"\n---\n"
                }
            }
        }))
        .unwrap();
        assert_eq!(call["result"]["structuredContent"]["valid"], true);
    }
}
