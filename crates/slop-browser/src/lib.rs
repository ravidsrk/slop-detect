//! Zero-Playwright, zero-Node Chrome/Chromium discovery and raw Chrome DevTools Protocol (CDP) scanner.
//!
//! Discovers system Chrome/Chromium/Edge/Brave (or cached Playwright Chromium binaries),
//! launches headless Chromium with `--remote-debugging-port=0`, speaks CDP directly over
//! `tungstenite` WebSockets, evaluates the embedded `browser-bundle/probe.js` collector,
//! and scores all axes in native Rust via `slop-core`.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use slop_core::copy::{score_copy, CopyInput, CopyLink, CopyScoreResult};
use slop_core::craft::{score_craft, CraftScoreResult};
use slop_core::design::{score_patterns, DesignScoreResult, PatternInput, DESIGN_PATTERNS};
use slop_core::design_md::{
    apply_design_system_waivers, parse_design_md, score_system_compliance, SystemComplianceResult,
    WaivedPattern,
};
use slop_core::verdict::{combine_axes, AxisSummaryInput, CombinedAxesResult};
use slop_core::{DEFINITIONS_VERSION, SCAN_SCHEMA_VERSION};
use std::collections::HashMap;
use std::env;
use std::fs;
use std::io::{BufRead, BufReader};
use std::net::TcpStream;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::mpsc;
use std::thread;
use std::time::{Duration, Instant};
use thiserror::Error;
use tungstenite::{connect, Message, WebSocket};

const PROBE_JS: &str = include_str!("../../../browser-bundle/probe.js");
const MOBILE_REFLOW_JS: &str = include_str!("../../../browser-bundle/mobile-reflow.js");

#[derive(Debug, Error)]
pub enum BrowserError {
    #[error("no Chrome, Chromium, Edge, or Brave binary found on this machine (set SLOP_CHROME_PATH or install Chrome)")]
    ChromeNotFound,
    #[error("failed to spawn Chromium at {0}: {1}")]
    SpawnFailed(String, std::io::Error),
    #[error("Chromium did not publish a DevTools WebSocket endpoint within {0}s")]
    DevToolsTimeout(u64),
    #[error("CDP WebSocket error: {0}")]
    WebSocket(String),
    #[error("CDP protocol error: {0}")]
    Protocol(String),
    #[error("page evaluation failed: {0}")]
    EvalFailed(String),
}

#[derive(Debug, Clone)]
pub struct BrowserScanOptions {
    pub chrome_path: Option<PathBuf>,
    pub include_copy: bool,
    pub include_craft: bool,
    pub design_md_text: Option<String>,
    pub timeout_secs: u64,
    pub settle_ms: u64,
}

impl Default for BrowserScanOptions {
    fn default() -> Self {
        Self {
            chrome_path: None,
            include_copy: false,
            include_craft: false,
            design_md_text: None,
            timeout_secs: 25,
            settle_ms: 350,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeScanResult {
    pub schema_version: u32,
    pub definitions_version: String,
    pub engine: String,
    pub url: String,
    pub title: String,
    pub score: u32,
    pub tier: String,
    pub grade: String,
    pub verdict: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raw_score: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raw_tier: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub waived_patterns: Vec<WaivedPattern>,
    pub patterns_flagged: usize,
    pub patterns_total: usize,
    pub elapsed_ms: u128,
    pub chrome_binary: String,
    pub design: DesignScoreResult,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub copy: Option<CopyScoreResult>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub craft: Option<CraftScoreResult>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub system: Option<SystemComplianceResult>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub observed_system: Option<Value>,
    pub unified: CombinedAxesResult,
}

/// Auto-discover an executable Chrome/Chromium binary without requiring Playwright.
pub fn discover_chrome(explicit: Option<&Path>) -> Option<PathBuf> {
    if let Some(p) = explicit {
        if p.is_file() {
            return Some(p.to_path_buf());
        }
    }
    for env_key in ["SLOP_CHROME_PATH", "CHROME_PATH", "CHROMIUM_PATH"] {
        if let Ok(val) = env::var(env_key) {
            let p = PathBuf::from(val);
            if p.is_file() {
                return Some(p);
            }
        }
    }

    // 1. Standard OS install locations + PATH
    let mut candidates: Vec<PathBuf> = Vec::new();
    for bin in [
        "google-chrome",
        "google-chrome-stable",
        "chromium",
        "chromium-browser",
        "brave-browser",
        "microsoft-edge",
    ] {
        if let Some(found) = which_in_path(bin) {
            candidates.push(found);
        }
    }
    for fixed in [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/snap/bin/chromium",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    ] {
        candidates.push(PathBuf::from(fixed));
    }

    for c in candidates {
        if c.is_file() {
            return Some(c);
        }
    }

    // 2. Fallback: Playwright-cached Chromium or headless_shell on disk (still zero Playwright runtime!)
    if let Ok(home) = env::var("HOME") {
        let pw_dir = PathBuf::from(home).join(".cache").join("ms-playwright");
        if let Ok(entries) = fs::read_dir(&pw_dir) {
            let mut found_bins: Vec<(String, PathBuf)> = Vec::new();
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if !name.starts_with("chromium") {
                    continue;
                }
                let root = entry.path();
                for sub in [
                    "chrome-linux/chrome",
                    "chrome-linux64/chrome",
                    "chrome-linux-arm64/chrome",
                    "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
                    "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
                    "chrome-linux/headless_shell",
                    "chrome-headless-shell-linux64/chrome-headless-shell",
                    "chrome-headless-shell-linux-arm64/chrome-headless-shell",
                    "chrome-headless-shell-mac-arm64/chrome-headless-shell",
                ] {
                    let cand = root.join(sub);
                    if cand.is_file() {
                        found_bins.push((name.clone(), cand));
                    }
                }
            }
            // Prefer full chrome over headless_shell, and newest revision first.
            found_bins.sort_by(|a, b| {
                let a_full = !a.0.contains("headless_shell");
                let b_full = !b.0.contains("headless_shell");
                b_full.cmp(&a_full).then_with(|| b.0.cmp(&a.0))
            });
            if let Some((_, best)) = found_bins.into_iter().next() {
                return Some(best);
            }
        }
    }

    None
}

fn which_in_path(bin: &str) -> Option<PathBuf> {
    let path_var = env::var_os("PATH")?;
    for dir in env::split_paths(&path_var) {
        let full = dir.join(bin);
        if full.is_file() {
            return Some(full);
        }
    }
    None
}

struct ChromeGuard {
    child: Child,
    user_data_dir: PathBuf,
}

impl Drop for ChromeGuard {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
        let _ = fs::remove_dir_all(&self.user_data_dir);
    }
}

struct CdpSession {
    ws: WebSocket<tungstenite::stream::MaybeTlsStream<TcpStream>>,
    next_id: u64,
}

impl CdpSession {
    fn connect(ws_url: &str) -> Result<Self, BrowserError> {
        let (ws, _) = connect(ws_url).map_err(|e| BrowserError::WebSocket(e.to_string()))?;
        Ok(Self { ws, next_id: 1 })
    }

    fn send(&mut self, method: &str, params: Value) -> Result<Value, BrowserError> {
        let id = self.next_id;
        self.next_id += 1;
        let payload = json!({
            "id": id,
            "method": method,
            "params": params,
        });
        self.ws
            .send(Message::Text(payload.to_string()))
            .map_err(|e| BrowserError::WebSocket(e.to_string()))?;

        loop {
            let msg = self
                .ws
                .read()
                .map_err(|e| BrowserError::WebSocket(e.to_string()))?;
            let Message::Text(txt) = msg else {
                continue;
            };
            let v: Value =
                serde_json::from_str(&txt).map_err(|e| BrowserError::Protocol(e.to_string()))?;
            if v.get("id").and_then(|x| x.as_u64()) == Some(id) {
                if let Some(err) = v.get("error") {
                    return Err(BrowserError::Protocol(err.to_string()));
                }
                return Ok(v.get("result").cloned().unwrap_or(Value::Null));
            }
        }
    }

    fn wait_for_event(&mut self, event_name: &str, timeout: Duration) -> Result<(), BrowserError> {
        let deadline = Instant::now() + timeout;
        if let tungstenite::stream::MaybeTlsStream::Plain(ref s) = self.ws.get_ref() {
            let _ = s.set_read_timeout(Some(Duration::from_millis(250)));
        }
        loop {
            if Instant::now() >= deadline {
                break;
            }
            match self.ws.read() {
                Ok(Message::Text(txt)) => {
                    if let Ok(v) = serde_json::from_str::<Value>(&txt) {
                        if v.get("method").and_then(|m| m.as_str()) == Some(event_name) {
                            break;
                        }
                    }
                }
                Ok(_) => {}
                Err(tungstenite::Error::Io(ref e))
                    if matches!(
                        e.kind(),
                        std::io::ErrorKind::WouldBlock | std::io::ErrorKind::TimedOut
                    ) => {}
                Err(_) => break,
            }
        }
        if let tungstenite::stream::MaybeTlsStream::Plain(ref s) = self.ws.get_ref() {
            let _ = s.set_read_timeout(Some(Duration::from_secs(20)));
        }
        Ok(())
    }

    fn eval_json(&mut self, expression: &str, await_promise: bool) -> Result<Value, BrowserError> {
        let res = self.send(
            "Runtime.evaluate",
            json!({
                "expression": expression,
                "returnByValue": true,
                "awaitPromise": await_promise,
            }),
        )?;
        if let Some(exc) = res.get("exceptionDetails") {
            return Err(BrowserError::EvalFailed(exc.to_string()));
        }
        Ok(res
            .get("result")
            .and_then(|r| r.get("value"))
            .cloned()
            .unwrap_or(Value::Null))
    }
}

fn spawn_chrome(chrome_path: &Path, timeout_secs: u64) -> Result<(ChromeGuard, u16), BrowserError> {
    let unique = format!(
        "slop-cdp-{}-{}",
        std::process::id(),
        Instant::now().elapsed().as_nanos()
    );
    let user_data_dir = env::temp_dir().join(unique);
    let _ = fs::create_dir_all(&user_data_dir);

    let bin_name = chrome_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    let is_headless_shell = bin_name.contains("headless");

    let mut cmd = Command::new(chrome_path);
    if !is_headless_shell {
        cmd.arg("--headless=new");
    }
    cmd.args([
        "--remote-debugging-port=0",
        "--remote-debugging-address=127.0.0.1",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-networking",
        "--disable-extensions",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--no-sandbox",
        "--window-size=1280,800",
    ])
    .arg(format!("--user-data-dir={}", user_data_dir.display()))
    .arg("about:blank")
    .stdin(Stdio::null())
    .stdout(Stdio::null())
    .stderr(Stdio::piped());

    let mut child = cmd
        .spawn()
        .map_err(|e| BrowserError::SpawnFailed(chrome_path.display().to_string(), e))?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| BrowserError::Protocol("failed to capture Chromium stderr".to_string()))?;

    let (tx, rx) = mpsc::channel::<u16>();
    thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().map_while(Result::ok) {
            if let Some(pos) = line.find("ws://127.0.0.1:") {
                let after = &line[pos + "ws://127.0.0.1:".len()..];
                if let Some(slash) = after.find('/') {
                    if let Ok(port) = after[..slash].parse::<u16>() {
                        let _ = tx.send(port);
                        break;
                    }
                }
            }
        }
    });

    let port = rx
        .recv_timeout(Duration::from_secs(timeout_secs.min(12)))
        .map_err(|_| BrowserError::DevToolsTimeout(timeout_secs.min(12)))?;

    Ok((
        ChromeGuard {
            child,
            user_data_dir,
        },
        port,
    ))
}

fn find_page_ws_url(port: u16) -> Result<String, BrowserError> {
    let list_url = format!("http://127.0.0.1:{}/json/list", port);
    for _ in 0..20 {
        if let Ok(resp) = ureq::get(&list_url).call() {
            if let Ok(targets) = resp.into_json::<Value>() {
                if let Some(arr) = targets.as_array() {
                    for t in arr {
                        if t.get("type").and_then(|v| v.as_str()) == Some("page") {
                            if let Some(ws) = t.get("webSocketDebuggerUrl").and_then(|v| v.as_str()) {
                                return Ok(ws.to_string());
                            }
                        }
                    }
                }
            }
        }
        thread::sleep(Duration::from_millis(50));
    }
    Err(BrowserError::Protocol("no page target found on CDP /json/list".to_string()))
}

/// Scan any URL (http://, https://, file://) using native Chrome + raw CDP + Rust `slop-core`.
pub fn scan_url_cdp(url: &str, opts: &BrowserScanOptions) -> Result<NativeScanResult, BrowserError> {
    let started = Instant::now();
    let chrome_bin =
        discover_chrome(opts.chrome_path.as_deref()).ok_or(BrowserError::ChromeNotFound)?;

    let (_guard, port) = spawn_chrome(&chrome_bin, opts.timeout_secs)?;
    let page_ws = find_page_ws_url(port)?;
    let mut cdp = CdpSession::connect(&page_ws)?;

    cdp.send("Page.enable", json!({}))?;
    cdp.send("Runtime.enable", json!({}))?;
    cdp.send(
        "Emulation.setDeviceMetricsOverride",
        json!({
            "width": 1280,
            "height": 800,
            "deviceScaleFactor": 1,
            "mobile": false
        }),
    )?;

    cdp.send("Page.navigate", json!({ "url": url }))?;
    cdp.wait_for_event("Page.loadEventFired", Duration::from_secs(opts.timeout_secs))?;

    // Wait for document.fonts.ready + short layout settle
    let _ = cdp.eval_json(
        "Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 1500))])",
        true,
    );
    if opts.settle_ms > 0 {
        thread::sleep(Duration::from_millis(opts.settle_ms));
    }

    let raw = cdp.eval_json(PROBE_JS, false)?;
    if !raw.is_object() {
        return Err(BrowserError::EvalFailed(
            "probe script returned non-object payload".to_string(),
        ));
    }

    let title = raw
        .get("title")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    // Assemble PatternInput rows across all 45 canonical design patterns
    let signals_obj = raw.get("signals").and_then(|v| v.as_object());
    let pattern_inputs: Vec<PatternInput> = DESIGN_PATTERNS
        .iter()
        .map(|meta| {
            let sig = signals_obj
                .and_then(|m| m.get(meta.id))
                .cloned()
                .unwrap_or_else(|| json!({ "triggered": false }));
            let triggered = sig
                .get("triggered")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            PatternInput {
                id: meta.id.to_string(),
                label: Some(meta.label.to_string()),
                weight: Some(meta.weight),
                triggered,
                status: None,
                rule_status: Some(meta.status.to_string()),
                evidence: sig,
            }
        })
        .collect();
    let design = score_patterns(&pattern_inputs);

    // Optional Copy axis
    let copy = if opts.include_copy {
        let tc = raw.get("textContext");
        let text = tc
            .and_then(|t| t.get("text"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let lang = tc
            .and_then(|t| t.get("lang"))
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string());
        let headings: Vec<String> = tc
            .and_then(|t| t.get("headings"))
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|x| x.as_str().map(|s| s.to_string()))
                    .collect()
            })
            .unwrap_or_default();
        let links: Vec<CopyLink> = tc
            .and_then(|t| t.get("links"))
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|x| {
                        let href = x.get("href")?.as_str()?.to_string();
                        let text = x.get("text").and_then(|t| t.as_str()).map(|s| s.to_string());
                        Some(CopyLink { href, text })
                    })
                    .collect()
            })
            .unwrap_or_default();
        let word_count = tc
            .and_then(|t| t.get("wordCount"))
            .and_then(|v| v.as_u64())
            .map(|n| n as usize);
        let prose_word_count = tc
            .and_then(|t| t.get("proseWordCount"))
            .and_then(|v| v.as_u64())
            .map(|n| n as usize);

        Some(score_copy(&CopyInput {
            text,
            lang,
            headings,
            paragraphs: vec![],
            links,
            word_count,
            prose_word_count,
        }))
    } else {
        None
    };

    // Optional Craft axis (with real 390x800 mobile reflow pass over CDP!)
    let craft = if opts.include_craft {
        let mut craft_map: HashMap<String, Value> = raw
            .get("craftSignals")
            .and_then(|v| v.as_object())
            .map(|m| m.iter().map(|(k, v)| (k.clone(), v.clone())).collect())
            .unwrap_or_default();

        // Mobile reflow probe at 390x800
        if cdp
            .send(
                "Emulation.setDeviceMetricsOverride",
                json!({
                    "width": 390,
                    "height": 800,
                    "deviceScaleFactor": 1,
                    "mobile": true
                }),
            )
            .is_ok()
        {
            thread::sleep(Duration::from_millis(60));
            if let Ok(reflow_val) = cdp.eval_json(MOBILE_REFLOW_JS, false) {
                if reflow_val.is_object() {
                    craft_map.insert("mobile_reflow_failure".to_string(), reflow_val);
                }
            }
            let _ = cdp.send(
                "Emulation.setDeviceMetricsOverride",
                json!({
                    "width": 1280,
                    "height": 800,
                    "deviceScaleFactor": 1,
                    "mobile": false
                }),
            );
        }

        Some(score_craft(&craft_map))
    } else {
        None
    };

    // Optional DESIGN.md System Compliance axis + S-03 token-scoped waivers
    let observed_system = raw.get("systemContext").cloned();
    let parsed_design_md = opts.design_md_text.as_deref().and_then(parse_design_md);
    let system = opts.design_md_text.as_deref().map(|_| {
        let obs = observed_system.clone().unwrap_or(Value::Null);
        score_system_compliance(parsed_design_md.as_ref(), &obs)
    });

    let (design, raw_score, raw_tier, waived_patterns) = if let Some(ref parsed_sys) = parsed_design_md {
        let w = apply_design_system_waivers(&design, parsed_sys);
        if w.waived_patterns.is_empty() {
            (design, None, None, vec![])
        } else {
            (w.design, Some(w.raw_score), Some(w.raw_tier), w.waived_patterns)
        }
    } else {
        (design, None, None, vec![])
    };

    let unified = combine_axes(
        Some(&AxisSummaryInput {
            score: design.score,
            tier: design.tier.clone(),
        }),
        copy.as_ref().map(|c| AxisSummaryInput {
            score: c.score,
            tier: c.tier.clone(),
        }).as_ref(),
    );

    Ok(NativeScanResult {
        schema_version: SCAN_SCHEMA_VERSION,
        definitions_version: DEFINITIONS_VERSION.to_string(),
        engine: format!("rust-cdp/{}", slop_core::ENGINE_VERSION),
        url: url.to_string(),
        title,
        score: design.score,
        tier: design.tier.clone(),
        grade: design.grade.clone(),
        verdict: design.verdict.clone(),
        raw_score,
        raw_tier,
        waived_patterns,
        patterns_flagged: design.patterns_flagged,
        patterns_total: design.patterns_total,
        elapsed_ms: started.elapsed().as_millis(),
        chrome_binary: chrome_bin.display().to_string(),
        design,
        copy,
        craft,
        system,
        observed_system,
        unified,
    })
}
