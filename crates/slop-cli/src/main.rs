//! Single static native binary (`slop-detect`) for all waves:
//! - `check`: sub-20ms static source, DESIGN.md & paste-artifact audit
//! - `scan`: zero-Playwright raw CDP headless Chromium 5-axis scan
//! - `aeo`: native HTTP/TLS AEO crawler eligibility check
//! - `design`: instant offline DESIGN.md lint & breaking token diff
//! - `hook`: sub-15ms PostToolUse / Stop coding-agent hook
//! - `mcp`: native offline stdio MCP server
//! - `doctor`: local runtime & Chrome discovery diagnostics
//! - `engine-probe`: <1ms version probe for shell/npm launchers

use clap::{Parser, Subcommand, ValueEnum};
use serde_json::json;
use slop_aeo::run_aeo_audit;
use slop_browser::{discover_chrome, scan_url_cdp, BrowserScanOptions};
use slop_core::design::DESIGN_PATTERNS;
use slop_core::design_md::{diff_design_md, lint_design_md};
use slop_core::{DEFINITIONS_VERSION, ENGINE_VERSION};
use slop_hook::run_hook_stdio;
use slop_mcp::serve_stdio;
use slop_static::{check_path, StaticCheckOptions};
use std::fs;
use std::path::PathBuf;
use std::process;

#[derive(Debug, Clone, Copy, ValueEnum)]
enum OutputFormat {
    Human,
    Json,
    Agent,
    Github,
    Sarif,
}

#[derive(Debug, Parser)]
#[command(
    name = "slop-detect",
    version = ENGINE_VERSION,
    about = "Native deterministic auditor across Design, Copy, DESIGN.md/DTCG System, Craft, and AEO."
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Debug, Subcommand)]
enum Commands {
    /// Sub-20ms static check of source files, DESIGN.md tokens, and chatbot paste artifacts (no browser).
    Check {
        /// File or directory to check.
        #[arg(default_value = ".")]
        path: PathBuf,
        /// Optional path to DESIGN.md or tokens.json.
        #[arg(long)]
        design_md: Option<PathBuf>,
        /// Check hardcoded CSS/JSX colors against DESIGN.md palette in Oklab ΔE.
        #[arg(long, default_value_t = true)]
        colors: bool,
        /// Output format.
        #[arg(long, value_enum, default_value_t = OutputFormat::Human)]
        format: OutputFormat,
        /// Exit non-zero on findings of this severity (error, warning, none).
        #[arg(long, default_value = "error")]
        fail_on: String,
    },
    /// Scan a live or local URL via raw Chrome DevTools Protocol (no Playwright, no Node).
    Scan {
        /// URL to scan (http://, https://, or file://).
        url: String,
        /// Include copy axis.
        #[arg(long)]
        copy: bool,
        /// Include craft-floor axis (with 390x800 mobile reflow pass).
        #[arg(long)]
        craft: bool,
        /// Path to local DESIGN.md or DTCG tokens.json.
        #[arg(long)]
        design_md: Option<PathBuf>,
        /// Explicit path to Chrome/Chromium executable.
        #[arg(long)]
        chrome_path: Option<PathBuf>,
        /// Output format.
        #[arg(long, value_enum, default_value_t = OutputFormat::Human)]
        format: OutputFormat,
        /// Exit non-zero at or above tier (mild, heavy, none).
        #[arg(long, default_value = "none")]
        fail_on: String,
    },
    /// Run native HTTP AEO technical crawler eligibility audit (no browser).
    Aeo {
        /// Target http:// or https:// URL.
        url: String,
        /// Output format.
        #[arg(long, value_enum, default_value_t = OutputFormat::Human)]
        format: OutputFormat,
        /// Exit non-zero if AEO score is below this threshold.
        #[arg(long)]
        fail_under: Option<u32>,
    },
    /// DESIGN.md & DTCG offline governance tools (lint, diff).
    Design {
        #[command(subcommand)]
        action: DesignAction,
    },
    /// Run as a coding-agent hook (reads JSON from stdin).
    Hook,
    /// Start native offline stdio MCP server.
    Mcp,
    /// Diagnose native binary, Chrome/CDP discovery, and workspace DESIGN.md.
    Doctor,
    /// Fast <1ms version probe used by skill/npm launchers.
    EngineProbe,
}

#[derive(Debug, Subcommand)]
enum DesignAction {
    /// Lint a DESIGN.md file for broken refs, WCAG <4.5:1 contrast, and orphaned tokens.
    Lint {
        file: PathBuf,
        #[arg(long, value_enum, default_value_t = OutputFormat::Human)]
        format: OutputFormat,
    },
    /// Diff two DESIGN.md files token-by-token and detect breaking removals/changes.
    Diff {
        base: PathBuf,
        head: PathBuf,
        #[arg(long, value_enum, default_value_t = OutputFormat::Human)]
        format: OutputFormat,
        #[arg(long)]
        fail_on_breaking: bool,
    },
}

fn main() {
    let cli = Cli::parse();
    let code = match cli.command {
        Commands::EngineProbe => {
            println!("slop-detect-engine {} definitions/{}", ENGINE_VERSION, DEFINITIONS_VERSION);
            0
        }
        Commands::Hook => run_hook_stdio(),
        Commands::Mcp => serve_stdio(),
        Commands::Doctor => run_doctor(),
        Commands::Check {
            path,
            design_md,
            colors,
            format,
            fail_on,
        } => run_check(path, design_md, colors, format, &fail_on),
        Commands::Scan {
            url,
            copy,
            craft,
            design_md,
            chrome_path,
            format,
            fail_on,
        } => run_scan(url, copy, craft, design_md, chrome_path, format, &fail_on),
        Commands::Aeo {
            url,
            format,
            fail_under,
        } => run_aeo(url, format, fail_under),
        Commands::Design { action } => match action {
            DesignAction::Lint { file, format } => run_design_lint(file, format),
            DesignAction::Diff {
                base,
                head,
                format,
                fail_on_breaking,
            } => run_design_diff(base, head, format, fail_on_breaking),
        },
    };
    process::exit(code);
}

fn run_doctor() -> i32 {
    let chrome = discover_chrome(None);
    let has_design_md = PathBuf::from("DESIGN.md").is_file();
    println!(
        "{}",
        serde_json::to_string_pretty(&json!({
            "engineVersion": ENGINE_VERSION,
            "definitionsVersion": DEFINITIONS_VERSION,
            "designPatterns": DESIGN_PATTERNS.len(),
            "chromeDiscovered": chrome.is_some(),
            "chromePath": chrome.map(|p| p.display().to_string()),
            "workspaceDesignMd": has_design_md,
            "runtime": "native-rust (zero Node, zero Playwright)"
        }))
        .unwrap()
    );
    0
}

fn run_check(
    path: PathBuf,
    design_md: Option<PathBuf>,
    colors: bool,
    format: OutputFormat,
    fail_on: &str,
) -> i32 {
    let report = check_path(
        &path,
        &StaticCheckOptions {
            design_md,
            check_colors: colors,
            max_files: 2000,
        },
    );

    match format {
        OutputFormat::Json => {
            println!("{}", serde_json::to_string_pretty(&report).unwrap());
        }
        OutputFormat::Agent => {
            let top: Vec<String> = report
                .diagnostics
                .iter()
                .take(5)
                .map(|d| format!("{}:{}({})", d.file, d.line, d.rule_id))
                .collect();
            println!(
                "static files={} errors={} warnings={} elapsed_ms={} top=[{}]",
                report.files_scanned,
                report.errors,
                report.warnings,
                report.elapsed_ms,
                top.join(",")
            );
        }
        OutputFormat::Github => {
            for d in &report.diagnostics {
                let level = if d.severity == "error" { "error" } else { "warning" };
                println!(
                    "::{} file={},line={},col={},title={}::{}",
                    level, d.file, d.line, d.col, d.rule_id, d.message
                );
            }
        }
        OutputFormat::Sarif => {
            let results: Vec<serde_json::Value> = report
                .diagnostics
                .iter()
                .map(|d| {
                    json!({
                        "ruleId": d.rule_id,
                        "level": if d.severity == "error" { "error" } else { "warning" },
                        "message": { "text": d.message },
                        "locations": [{
                            "physicalLocation": {
                                "artifactLocation": { "uri": d.file },
                                "region": { "startLine": d.line, "startColumn": d.col }
                            }
                        }]
                    })
                })
                .collect();
            let sarif = json!({
                "version": "2.1.0",
                "runs": [{
                    "tool": {
                        "driver": {
                            "name": "slop-detect-native",
                            "version": ENGINE_VERSION
                        }
                    },
                    "results": results
                }]
            });
            println!("{}", serde_json::to_string_pretty(&sarif).unwrap());
        }
        OutputFormat::Human => {
            println!(
                "slop-detect check: {} file(s) in {} ms — {} error(s), {} warning(s)",
                report.files_scanned, report.elapsed_ms, report.errors, report.warnings
            );
            for d in &report.diagnostics {
                println!(
                    "  [{}] {}:{}:{} {} — {}",
                    d.severity, d.file, d.line, d.col, d.rule_id, d.message
                );
            }
        }
    }

    match fail_on {
        "error" if report.errors > 0 => 1,
        "warning" if report.errors > 0 || report.warnings > 0 => 1,
        _ => 0,
    }
}

fn run_scan(
    url: String,
    copy: bool,
    craft: bool,
    design_md: Option<PathBuf>,
    chrome_path: Option<PathBuf>,
    format: OutputFormat,
    fail_on: &str,
) -> i32 {
    let design_md_text = design_md.and_then(|p| fs::read_to_string(p).ok());
    let opts = BrowserScanOptions {
        chrome_path,
        include_copy: copy,
        include_craft: craft,
        design_md_text,
        ..Default::default()
    };

    match scan_url_cdp(&url, &opts) {
        Ok(res) => {
            match format {
                OutputFormat::Json => {
                    println!("{}", serde_json::to_string_pretty(&res).unwrap());
                }
                OutputFormat::Agent => {
                    let flagged: Vec<&str> = res
                        .design
                        .patterns
                        .iter()
                        .filter(|p| p.triggered)
                        .map(|p| p.id.as_str())
                        .collect();
                    let sys = res
                        .system
                        .as_ref()
                        .and_then(|s| s.score)
                        .map(|s| format!(" system={}/100", s))
                        .unwrap_or_default();
                    let cr = res
                        .craft
                        .as_ref()
                        .and_then(|c| c.score)
                        .map(|s| format!(" craft={}/100", s))
                        .unwrap_or_default();
                    println!(
                        "score={}/100 tier={} grade={}{}{} ms={} flagged=[{}]",
                        res.score,
                        res.tier,
                        res.grade,
                        cr,
                        sys,
                        res.elapsed_ms,
                        flagged.join(",")
                    );
                }
                OutputFormat::Sarif => {
                    let results: Vec<serde_json::Value> = res
                        .design
                        .patterns
                        .iter()
                        .filter(|p| p.triggered)
                        .map(|p| {
                            json!({
                                "ruleId": p.id,
                                "level": if p.status == "fail" { "error" } else { "note" },
                                "message": { "text": format!("{} (weight {}, delta {})", p.label, p.weight, p.score_delta) }
                            })
                        })
                        .collect();
                    println!(
                        "{}",
                        serde_json::to_string_pretty(&json!({
                            "version": "2.1.0",
                            "runs": [{
                                "tool": { "driver": { "name": "slop-detect-cdp", "version": ENGINE_VERSION } },
                                "results": results
                            }]
                        }))
                        .unwrap()
                    );
                }
                OutputFormat::Github | OutputFormat::Human => {
                    println!(
                        "slop-detect scan (native CDP, {} ms): {} — {}/100 ({}, {})",
                        res.elapsed_ms, res.url, res.score, res.tier, res.grade
                    );
                    println!("  verdict: {}", res.verdict);
                    for p in res.design.patterns.iter().filter(|p| p.triggered) {
                        println!(
                            "  - [{}] {} (w={}, +{})",
                            p.status, p.id, p.weight, p.score_delta
                        );
                    }
                    if let Some(ref c) = res.copy {
                        println!("  copy: {}/100 ({}, {})", c.score, c.tier, c.grade);
                    }
                    if let Some(ref cr) = res.craft {
                        println!("  craft: {:?}/100 (failed={:?})", cr.score, cr.failed_ids);
                    }
                    if let Some(ref s) = res.system {
                        println!("  system: {:?}/100 ({}, drift={:?})", s.score, s.tier, s.drift_ids);
                    }
                }
            }

            let failed = match fail_on {
                "mild" => res.score >= 10,
                "heavy" => res.score >= 28,
                _ => false,
            };
            if failed { 1 } else { 0 }
        }
        Err(e) => {
            eprintln!("Scan could not run (this is not a Clean score): {}", e);
            2
        }
    }
}

fn run_aeo(url: String, format: OutputFormat, fail_under: Option<u32>) -> i32 {
    match run_aeo_audit(&url, 15) {
        Ok(report) => {
            match format {
                OutputFormat::Json => {
                    println!("{}", serde_json::to_string_pretty(&report).unwrap());
                }
                OutputFormat::Agent => {
                    let failed: Vec<&str> = report
                        .checks
                        .iter()
                        .filter(|c| c.status == "fail")
                        .map(|c| c.id.as_str())
                        .collect();
                    println!(
                        "aeo={}/100 tier=\"{}\" ms={} failed=[{}]",
                        report.score,
                        report.tier,
                        report.elapsed_ms,
                        failed.join(",")
                    );
                }
                _ => {
                    println!(
                        "slop-detect aeo ({} ms): {} — {}/100 ({})",
                        report.elapsed_ms, report.url, report.score, report.tier
                    );
                    for c in &report.checks {
                        println!("  [{}] {} ({}/{}) — {}", c.status, c.id, c.earned, c.weight, c.message);
                    }
                }
            }
            if fail_under.is_some_and(|min| report.score < min) {
                1
            } else {
                0
            }
        }
        Err(e) => {
            eprintln!("AEO check failed: {}", e);
            2
        }
    }
}

fn run_design_lint(file: PathBuf, format: OutputFormat) -> i32 {
    let Ok(text) = fs::read_to_string(&file) else {
        eprintln!("Failed to read {}", file.display());
        return 2;
    };
    let res = lint_design_md(&text);
    match format {
        OutputFormat::Json => println!("{}", serde_json::to_string_pretty(&res).unwrap()),
        OutputFormat::Agent => println!(
            "design_md valid={} errors={} warnings={} specVersion={}",
            res.valid,
            res.errors.len(),
            res.warnings.len(),
            res.spec_version
        ),
        _ => {
            println!(
                "DESIGN.md lint ({}): {} ({} error(s), {} warning(s))",
                file.display(),
                if res.valid { "VALID" } else { "INVALID" },
                res.errors.len(),
                res.warnings.len()
            );
            for i in &res.issues {
                println!("  [{}] {} — {}", i.severity, i.rule_id, i.message);
            }
        }
    }
    if res.valid { 0 } else { 1 }
}

fn run_design_diff(base: PathBuf, head: PathBuf, format: OutputFormat, fail_on_breaking: bool) -> i32 {
    let (Ok(b), Ok(h)) = (fs::read_to_string(&base), fs::read_to_string(&head)) else {
        eprintln!("Failed to read {} or {}", base.display(), head.display());
        return 2;
    };
    let res = diff_design_md(&b, &h);
    match format {
        OutputFormat::Json => println!("{}", serde_json::to_string_pretty(&res).unwrap()),
        OutputFormat::Agent => println!(
            "design_diff breaking={} added={} removed={} changed={}",
            res.breaking,
            res.added.len(),
            res.removed.len(),
            res.changed.len()
        ),
        _ => {
            println!(
                "DESIGN.md diff: breaking={} (+{} added, -{} removed, ~{} changed)",
                res.breaking,
                res.added.len(),
                res.removed.len(),
                res.changed.len()
            );
            for a in &res.added {
                println!("  + {} = {}", a.path, a.value);
            }
            for r in &res.removed {
                println!("  - {} = {}", r.path, r.value);
            }
            for c in &res.changed {
                println!("  ~ {}: {} -> {}", c.path, c.before, c.after);
            }
        }
    }
    if fail_on_breaking && res.breaking { 1 } else { 0 }
}
