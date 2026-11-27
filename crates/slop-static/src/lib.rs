//! Sub-20ms static source, DESIGN.md / DTCG token drift, and zero-taste paste-artifact auditor.

use regex::Regex;
use serde::{Deserialize, Serialize};
use slop_core::copy::{detect_paste_artifacts, CopyLink};
use slop_core::design_md::{
    best_color_match, flatten_design_tokens, lint_design_md, parse_design_md, FlattenedTokens,
};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use std::time::Instant;
use walkdir::{DirEntry, WalkDir};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StaticDiagnostic {
    pub file: String,
    pub line: usize,
    pub col: usize,
    pub rule_id: String,
    pub axis: String,
    pub severity: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub snippet: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StaticCheckReport {
    pub root: String,
    pub files_scanned: usize,
    pub design_md_path: Option<String>,
    pub errors: usize,
    pub warnings: usize,
    pub elapsed_ms: u128,
    pub diagnostics: Vec<StaticDiagnostic>,
}

#[derive(Debug, Clone, Default)]
pub struct StaticCheckOptions {
    pub design_md: Option<PathBuf>,
    pub check_colors: bool,
    pub max_files: usize,
}

const IGNORED_DIRS: &[&str] = &[
    ".git",
    "node_modules",
    "target",
    "dist",
    "build",
    ".next",
    ".astro",
    ".turbo",
    ".wrangler",
    "coverage",
    ".cache",
    "browser-bundle",
    "oracle",
    "fixtures",
];

const SOURCE_EXTS: &[&str] = &[
    "css", "scss", "sass", "less", "html", "htm", "jsx", "tsx", "vue", "svelte", "astro", "md",
    "mdx",
];

const COLOR_CHECK_EXTS: &[&str] = &["css", "scss", "html", "htm", "jsx", "tsx", "vue", "svelte", "astro"];

fn is_ignored_dir(entry: &DirEntry) -> bool {
    if !entry.file_type().is_dir() {
        return false;
    }
    entry
        .file_name()
        .to_str()
        .is_some_and(|name| IGNORED_DIRS.contains(&name))
}

fn color_literal_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(r"(?i)(?:#(?:[0-9a-f]{6}|[0-9a-f]{3})\b|rgba?\([^)\n]{5,40}\)|oklch\([^)\n]{5,45}\))")
            .unwrap()
    })
}

fn directive_matches(s: &str, marker: &str, rule_id: &str) -> bool {
    let lower = s.to_ascii_lowercase();
    let Some(pos) = lower.find(marker) else {
        return false;
    };
    let rest = &lower[pos + marker.len()..];
    // Strip trailing comment delimiters (`-->`, `*/`)
    let clean = rest
        .split("-->")
        .next()
        .unwrap_or(rest)
        .split("*/")
        .next()
        .unwrap_or(rest)
        .trim();
    if let Some(target_rules) = clean.strip_prefix(':') {
        target_rules.contains(&rule_id.to_ascii_lowercase())
    } else {
        true
    }
}

fn is_waived_line(prev_line: Option<&str>, cur_line: &str, rule_id: &str) -> bool {
    if directive_matches(cur_line, "slop-ignore", rule_id)
        || directive_matches(cur_line, "slop-disable-line", rule_id)
    {
        return true;
    }
    if let Some(prev) = prev_line {
        if directive_matches(prev, "slop-disable-next-line", rule_id) {
            return true;
        }
    }
    false
}

fn find_project_design_md(start: &Path) -> Option<PathBuf> {
    let dir = if start.is_file() {
        start.parent().unwrap_or(start)
    } else {
        start
    };
    let mut cur = Some(dir);
    for _ in 0..5 {
        let Some(d) = cur else { break };
        for name in ["DESIGN.md", "tokens.json"] {
            let candidate = d.join(name);
            if candidate.is_file() {
                return Some(candidate);
            }
        }
        cur = d.parent();
    }
    None
}

pub fn check_file(
    path: &Path,
    palette_tokens: Option<&FlattenedTokens>,
    check_colors: bool,
) -> Vec<StaticDiagnostic> {
    let mut diags = Vec::new();
    let Ok(content) = fs::read_to_string(path) else {
        return diags;
    };
    // Skip very large generated files (> 512 KB)
    if content.len() > 512 * 1024 {
        return diags;
    }

    let file_str = path.to_string_lossy().to_string();
    let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())
        .unwrap_or_default();

    // 1. DESIGN.md static linter
    if file_name.eq_ignore_ascii_case("DESIGN.md") {
        let lint = lint_design_md(&content);
        for issue in lint.issues {
            diags.push(StaticDiagnostic {
                file: file_str.clone(),
                line: 1,
                col: 1,
                rule_id: format!("design-md.{}", issue.rule_id),
                axis: "system".to_string(),
                severity: issue.severity,
                message: issue.message,
                snippet: issue.path,
            });
        }
        return diags;
    }

    let lines: Vec<&str> = content.lines().collect();

    // 2. Zero-taste paste artifact checks (line-precise!)
    for (idx, line) in lines.iter().enumerate() {
        let prev = if idx > 0 { Some(lines[idx - 1]) } else { None };
        let artifacts = detect_paste_artifacts(line, &[] as &[CopyLink]);
        for finding in artifacts {
            if !finding.triggered {
                continue;
            }
            // Do not flag markdown syntax inside .md/.mdx files
            if finding.id == "leaked_markdown" && matches!(ext.as_str(), "md" | "mdx") {
                continue;
            }
            if is_waived_line(prev, line, &finding.id) {
                continue;
            }
            let severity = match finding.id.as_str() {
                "chatbot_markup_leak" | "chatbot_reply_residue" | "hidden_tag_characters" => "error",
                _ => "warning",
            };
            let sample = finding.samples.first().cloned();
            let col = sample
                .as_deref()
                .and_then(|s| line.find(s).map(|i| i + 1))
                .unwrap_or(1);
            diags.push(StaticDiagnostic {
                file: file_str.clone(),
                line: idx + 1,
                col,
                rule_id: format!("copy.{}", finding.id),
                axis: "copy".to_string(),
                severity: severity.to_string(),
                message: finding.label,
                snippet: sample,
            });
        }

        // 3. Hardcoded off-palette color drift check against DESIGN.md (Oklab ΔE > 0.05)
        if check_colors && COLOR_CHECK_EXTS.contains(&ext.as_str()) {
            if let Some(tokens) = palette_tokens {
                if !tokens.colors.is_empty() && !is_waived_line(prev, line, "system.color-drift") {
                    for m in color_literal_re().find_iter(line) {
                        let raw = m.as_str();
                        // Ignore pure white/black/transparent utility fallbacks
                        let lower = raw.to_ascii_lowercase();
                        if matches!(lower.as_str(), "#fff" | "#ffffff" | "#000" | "#000000") {
                            continue;
                        }
                        let cmp = best_color_match(&tokens.colors, raw);
                        if cmp.status == "off-palette" {
                            diags.push(StaticDiagnostic {
                                file: file_str.clone(),
                                line: idx + 1,
                                col: m.start() + 1,
                                rule_id: "system.color-drift".to_string(),
                                axis: "system".to_string(),
                                severity: "warning".to_string(),
                                message: format!(
                                    "Hardcoded color {} drifts from DESIGN.md palette (closest {}, ΔE={:.3})",
                                    raw,
                                    cmp.closest_token.as_deref().unwrap_or("none"),
                                    cmp.delta_e
                                ),
                                snippet: Some(raw.to_string()),
                            });
                        }
                    }
                }
            }
        }
    }

    diags
}

/// Audit a file or directory statically in milliseconds (zero browser, zero Node).
pub fn check_path(target: &Path, opts: &StaticCheckOptions) -> StaticCheckReport {
    let started = Instant::now();
    let design_md_path = opts
        .design_md
        .clone()
        .or_else(|| find_project_design_md(target));

    let palette_tokens = design_md_path
        .as_ref()
        .and_then(|p| fs::read_to_string(p).ok())
        .and_then(|txt| parse_design_md(&txt))
        .map(|parsed| flatten_design_tokens(&parsed));

    let max_files = if opts.max_files == 0 { 2000 } else { opts.max_files };
    let mut files_scanned = 0usize;
    let mut diagnostics = Vec::new();

    if target.is_file() {
        files_scanned = 1;
        diagnostics.extend(check_file(target, palette_tokens.as_ref(), opts.check_colors));
    } else if target.is_dir() {
        let walker = WalkDir::new(target)
            .into_iter()
            .filter_entry(|e| !is_ignored_dir(e));
        for entry in walker.flatten() {
            if !entry.file_type().is_file() {
                continue;
            }
            let p = entry.path();
            let name = p.file_name().and_then(|n| n.to_str()).unwrap_or("");
            let ext = p
                .extension()
                .and_then(|e| e.to_str())
                .map(|e| e.to_ascii_lowercase())
                .unwrap_or_default();
            if !name.eq_ignore_ascii_case("DESIGN.md") && !SOURCE_EXTS.contains(&ext.as_str()) {
                continue;
            }
            files_scanned += 1;
            diagnostics.extend(check_file(p, palette_tokens.as_ref(), opts.check_colors));
            if files_scanned >= max_files {
                break;
            }
        }
    }

    let errors = diagnostics.iter().filter(|d| d.severity == "error").count();
    let warnings = diagnostics.iter().filter(|d| d.severity == "warning").count();

    StaticCheckReport {
        root: target.to_string_lossy().to_string(),
        files_scanned,
        design_md_path: design_md_path.map(|p| p.to_string_lossy().to_string()),
        errors,
        warnings,
        elapsed_ms: started.elapsed().as_millis(),
        diagnostics,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn catches_paste_artifacts_and_respects_inline_waivers() {
        let dir = std::env::temp_dir().join(format!("slop-static-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();

        fs::write(
            dir.join("DESIGN.md"),
            "---\nname: Test\nspecVersion: alpha\ncolors:\n  paper: \"#F4F5F2\"\n  ink: \"#181815\"\ncomponents:\n  card:\n    backgroundColor: \"{colors.paper}\"\n    textColor: \"{colors.ink}\"\n---\n",
        )
        .unwrap();

        fs::write(
            dir.join("index.html"),
            "<html><body>\n<p>Check :contentReference[oaicite:0]{index=0} for [Company Name]</p>\n<a href=\"https://example.com?utm_source=chatgpt.com\">Link</a>\n<div style=\"color:#8b5cf6\">Drift</div>\n<div style=\"color:#8b5cf6\">Waived</div> <!-- slop-ignore -->\n</body></html>\n",
        )
        .unwrap();

        let report = check_path(
            &dir,
            &StaticCheckOptions {
                design_md: None,
                check_colors: true,
                max_files: 100,
            },
        );
        let _ = fs::remove_dir_all(&dir);

        let rules: Vec<&str> = report.diagnostics.iter().map(|d| d.rule_id.as_str()).collect();
        assert!(rules.contains(&"copy.chatbot_markup_leak"), "{rules:?}");
        assert!(rules.contains(&"copy.unfilled_placeholders"), "{rules:?}");
        assert!(rules.contains(&"copy.ai_referral_utm_links"), "{rules:?}");
        assert_eq!(
            rules.iter().filter(|r| **r == "system.color-drift").count(),
            1,
            "second off-palette line should be waived"
        );
    }
}
