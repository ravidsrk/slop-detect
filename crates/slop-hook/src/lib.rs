//! Sub-15ms coding-agent hook engine (Claude Code, Cursor, Codex, Gemini, VS Code).
//!
//! Reads hook JSON from stdin. On `PostToolUse`, runs `slop-static` on the edited
//! file in <15ms (zero Node, zero browser). On `Stop`, optionally runs a native
//! CDP check when `SLOP_LOCAL_URL` is configured. Never crashes or blocks on
//! missing config.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use slop_browser::{scan_url_cdp, BrowserScanOptions};
use slop_static::{check_path, StaticCheckOptions};
use std::env;
use std::io::{self, Read};
use std::path::PathBuf;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct HookPayload {
    #[serde(default)]
    pub hook_event_name: Option<String>,
    #[serde(default)]
    pub tool_name: Option<String>,
    #[serde(default)]
    pub tool_input: Option<Value>,
    #[serde(default)]
    pub cwd: Option<String>,
}

pub fn run_hook_from_str(stdin_str: &str) -> Option<Value> {
    let trimmed = stdin_str.trim();
    if trimmed.is_empty() {
        return None;
    }
    let payload: HookPayload = serde_json::from_str(trimmed).ok()?;
    let event = payload.hook_event_name.as_deref().unwrap_or("");

    // Fast path: PostToolUse file edit -> sub-15ms static lint (paste artifacts + DESIGN.md drift)
    if event.eq_ignore_ascii_case("PostToolUse") {
        let file_path = payload
            .tool_input
            .as_ref()
            .and_then(|ti| {
                ti.get("file_path")
                    .or_else(|| ti.get("path"))
                    .or_else(|| ti.get("target_file"))
                    .and_then(|v| v.as_str())
            })?;
        let path = PathBuf::from(file_path);
        if !path.is_file() {
            return None;
        }
        let report = check_path(
            &path,
            &StaticCheckOptions {
                design_md: None,
                check_colors: true,
                max_files: 1,
            },
        );
        if report.diagnostics.is_empty() {
            return None;
        }
        let summary_lines: Vec<String> = report
            .diagnostics
            .iter()
            .take(5)
            .map(|d| {
                format!(
                    "[{}] {}:{} {} — {}",
                    d.severity, d.line, d.col, d.rule_id, d.message
                )
            })
            .collect();
        let note = format!(
            "slop-detect static hook ({} ms, {} error(s), {} warning(s)) on {}:\n{}",
            report.elapsed_ms,
            report.errors,
            report.warnings,
            file_path,
            summary_lines.join("\n")
        );
        return Some(json!({
            "hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": note,
            }
        }));
    }

    // Turn-end Stop hook: if SLOP_LOCAL_URL is set, run native CDP scan
    if event.eq_ignore_ascii_case("Stop") {
        let target_url = env::var("SLOP_LOCAL_URL").ok()?;
        if target_url.trim().is_empty() {
            return None;
        }
        let opts = BrowserScanOptions {
            include_copy: true,
            include_craft: false,
            ..Default::default()
        };
        if let Ok(res) = scan_url_cdp(&target_url, &opts) {
            if res.score >= 10 {
                let flagged: Vec<&str> = res
                    .design
                    .patterns
                    .iter()
                    .filter(|p| p.triggered && p.status == "fail")
                    .map(|p| p.id.as_str())
                    .take(5)
                    .collect();
                let note = format!(
                    "slop-detect CDP check on {}: score={}/100 ({}, {}), flagged=[{}], {} ms",
                    res.url,
                    res.score,
                    res.tier,
                    res.grade,
                    flagged.join(", "),
                    res.elapsed_ms
                );
                return Some(json!({
                    "systemMessage": note
                }));
            }
        }
    }

    None
}

pub fn run_hook_stdio() -> i32 {
    let mut buf = String::new();
    let _ = io::stdin().read_to_string(&mut buf);
    if let Some(out) = run_hook_from_str(&buf) {
        println!("{}", out);
    }
    0
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn post_tool_use_catches_leak_in_milliseconds() {
        let file = env::temp_dir().join(format!("slop-hook-test-{}.html", std::process::id()));
        fs::write(
            &file,
            "<p>Welcome to [Company Name]! :contentReference[oaicite:1]{index=1}</p>",
        )
        .unwrap();
        let payload = json!({
            "hook_event_name": "PostToolUse",
            "tool_name": "Write",
            "tool_input": { "file_path": file.to_string_lossy() }
        })
        .to_string();
        let out = run_hook_from_str(&payload);
        let _ = fs::remove_file(&file);
        let out = out.expect("hook should emit diagnostic context");
        let ctx = out["hookSpecificOutput"]["additionalContext"].as_str().unwrap();
        assert!(ctx.contains("copy.chatbot_markup_leak"), "{ctx}");
        assert!(ctx.contains("copy.unfilled_placeholders"), "{ctx}");
    }
}
