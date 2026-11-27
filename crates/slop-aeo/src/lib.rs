//! Native Rust HTTP/TLS AEO eligibility runner (zero Node, zero Chromium).

use serde::{Deserialize, Serialize};
use slop_core::aeo::{
    detect_prompt_injection, evaluate_robots_txt, parse_preview_directives, strip_html_to_text,
    validate_llms_txt, LlmsTxtValidation, PreviewDirectivesResult, RobotsEvalResult,
};
use slop_core::{AEO_SCANNER_USER_AGENT, DEFINITIONS_VERSION, SCAN_SCHEMA_VERSION};
use std::collections::HashMap;
use std::io::Read;
use std::time::{Duration, Instant};
use thiserror::Error;
use url::Url;

const MAX_BODY_BYTES: usize = 2 * 1024 * 1024;

#[derive(Debug, Error)]
pub enum AeoError {
    #[error("invalid URL: {0}")]
    InvalidUrl(#[from] url::ParseError),
    #[error("unsupported scheme '{0}' (AEO checks require http:// or https://)")]
    UnsupportedScheme(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AeoCheckRow {
    pub id: String,
    pub weight: u32,
    pub status: String,
    pub earned: f64,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AeoReport {
    pub schema_version: u32,
    pub definitions_version: String,
    pub axis: String,
    pub url: String,
    pub score: u32,
    pub tier: String,
    pub elapsed_ms: u128,
    pub checks: Vec<AeoCheckRow>,
    pub robots: RobotsEvalResult,
    pub preview: PreviewDirectivesResult,
    pub llms: LlmsTxtValidation,
    pub server_word_count: usize,
}

struct HttpReply {
    status: u16,
    content_type: String,
    headers: HashMap<String, String>,
    body: String,
    error: Option<String>,
}

fn fetch_capped(agent: &ureq::Agent, target: &str, accept: &str) -> HttpReply {
    let req = agent
        .get(target)
        .set("User-Agent", AEO_SCANNER_USER_AGENT)
        .set("Accept", accept);

    match req.call() {
        Ok(resp) => read_reply(resp),
        Err(ureq::Error::Status(_code, resp)) => read_reply(resp),
        Err(e) => HttpReply {
            status: 0,
            content_type: String::new(),
            headers: HashMap::new(),
            body: String::new(),
            error: Some(e.to_string()),
        },
    }
}

fn read_reply(resp: ureq::Response) -> HttpReply {
    let status = resp.status();
    let content_type = resp.content_type().to_string();
    let mut headers = HashMap::new();
    for name in resp.headers_names() {
        if let Some(val) = resp.header(&name) {
            headers.insert(name.to_ascii_lowercase(), val.to_string());
        }
    }
    let mut buf = Vec::new();
    let _ = resp
        .into_reader()
        .take(MAX_BODY_BYTES as u64)
        .read_to_end(&mut buf);
    let body = String::from_utf8_lossy(&buf).to_string();
    HttpReply {
        status,
        content_type,
        headers,
        body,
        error: None,
    }
}

fn to_markdown_url(parsed: &Url) -> String {
    let mut u = parsed.clone();
    let p = u.path().trim_end_matches('/');
    if !p.ends_with(".md") {
        let next = if p.is_empty() {
            "/index.md".to_string()
        } else {
            format!("{}.md", p)
        };
        u.set_path(&next);
    }
    u.to_string()
}

pub fn run_aeo_audit(raw_url: &str, timeout_secs: u64) -> Result<AeoReport, AeoError> {
    let started = Instant::now();
    let parsed = Url::parse(raw_url)?;
    if !matches!(parsed.scheme(), "http" | "https") {
        return Err(AeoError::UnsupportedScheme(parsed.scheme().to_string()));
    }

    let agent = ureq::AgentBuilder::new()
        .timeout_connect(Duration::from_secs(timeout_secs.min(10)))
        .timeout_read(Duration::from_secs(timeout_secs))
        .redirects(5)
        .build();

    let html_reply = fetch_capped(
        &agent,
        parsed.as_str(),
        "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    );

    let mut robots_url = parsed.clone();
    robots_url.set_path("/robots.txt");
    robots_url.set_query(None);
    robots_url.set_fragment(None);
    let robots_reply = fetch_capped(&agent, robots_url.as_str(), "text/plain,*/*");

    let mut llms_url = parsed.clone();
    llms_url.set_path("/llms.txt");
    llms_url.set_query(None);
    llms_url.set_fragment(None);
    let llms_reply = fetch_capped(&agent, llms_url.as_str(), "text/markdown,text/plain,*/*");

    let md_negotiated = fetch_capped(&agent, parsed.as_str(), "text/markdown,text/plain;q=0.9");
    let md_route_url = to_markdown_url(&parsed);
    let md_route = fetch_capped(&agent, &md_route_url, "text/markdown,text/plain,*/*");

    let reachable = html_reply.error.is_none() && (200..300).contains(&html_reply.status);
    let lower_body = html_reply.body.to_ascii_lowercase();
    let edge_blocked = html_reply.error.is_some()
        || matches!(html_reply.status, 403 | 429 | 503)
        || lower_body.contains("just a moment...")
        || lower_body.contains("attention required! | cloudflare");

    let robots = evaluate_robots_txt(
        &robots_reply.body,
        parsed.path(),
        robots_reply.status,
        &robots_reply.content_type,
        robots_reply.error.is_some(),
    );

    let preview = parse_preview_directives(&html_reply.headers, &html_reply.body);

    let plain_text = strip_html_to_text(&html_reply.body);
    let server_word_count = plain_text.split_whitespace().count();
    let has_server_text = reachable && server_word_count >= 40;

    let is_valid_md = |r: &HttpReply| {
        r.error.is_none()
            && (200..300).contains(&r.status)
            && !r.content_type.to_ascii_lowercase().contains("text/html")
            && !r.body.trim().to_ascii_lowercase().starts_with("<!doctype html")
            && !r.body.trim().to_ascii_lowercase().starts_with("<html")
            && r.body.trim().len() >= 40
    };
    let has_md_negotiated = is_valid_md(&md_negotiated);
    let has_md_route = is_valid_md(&md_route);
    let has_md_twin = has_md_negotiated || has_md_route;

    let has_link_alternate = html_reply
        .headers
        .get("link")
        .is_some_and(|l| l.to_ascii_lowercase().contains("text/markdown"))
        || (lower_body.contains("rel=\"alternate\"") && lower_body.contains("text/markdown"));

    let llms = if llms_reply.error.is_none() && (200..300).contains(&llms_reply.status) {
        validate_llms_txt(&llms_reply.body, &llms_reply.content_type)
    } else {
        LlmsTxtValidation {
            valid: false,
            has_h1: false,
            link_count: 0,
        }
    };

    let vary_ok = !has_md_negotiated
        || html_reply
            .headers
            .get("vary")
            .is_some_and(|v| v.to_ascii_lowercase().contains("accept"));

    let pi_hits = detect_prompt_injection(&html_reply.body);

    let mut checks = Vec::new();
    let mut push = |id: &str, weight: u32, status: &str, earned: f64, msg: String| {
        checks.push(AeoCheckRow {
            id: id.to_string(),
            weight,
            status: status.to_string(),
            earned,
            message: msg,
        });
    };

    push(
        "html.reachable",
        10,
        if reachable { "pass" } else { "fail" },
        if reachable { 10.0 } else { 0.0 },
        if reachable {
            format!("HTTP {} OK", html_reply.status)
        } else {
            format!(
                "Unreachable (status {}, {:?})",
                html_reply.status, html_reply.error
            )
        },
    );
    push(
        "edge.access",
        20,
        if !edge_blocked { "pass" } else { "fail" },
        if !edge_blocked { 20.0 } else { 0.0 },
        if !edge_blocked {
            "No edge WAF challenge or bot block detected".to_string()
        } else {
            format!("Edge blocked or challenged automated fetch (HTTP {})", html_reply.status)
        },
    );
    push(
        "robots.searchAllowed",
        20,
        if robots.search_allowed { "pass" } else { "fail" },
        if robots.search_allowed { 20.0 } else { 0.0 },
        if robots.search_allowed {
            "robots.txt allows AI search crawlers".to_string()
        } else {
            format!("Search crawlers blocked: {}", robots.search_blocked.join(", "))
        },
    );
    push(
        "html.indexable",
        12,
        if !preview.global_noindex { "pass" } else { "fail" },
        if !preview.global_noindex { 12.0 } else { 0.0 },
        if !preview.global_noindex {
            "No global noindex directive".to_string()
        } else {
            "Page emits global noindex/none directive".to_string()
        },
    );
    push(
        "ai.previewControls",
        8,
        &preview.status,
        preview.earned_weight,
        format!(
            "google={} bing={} apple={}",
            preview.google_status, preview.bing_status, preview.apple_status
        ),
    );
    push(
        "html.serverTextCoverage",
        15,
        if has_server_text { "pass" } else { "fail" },
        if has_server_text { 15.0 } else { 0.0 },
        format!("{} visible words in server-rendered HTML", server_word_count),
    );
    push(
        "md.twin",
        6,
        if has_md_twin { "pass" } else { "fail" },
        if has_md_twin { 6.0 } else { 0.0 },
        if has_md_negotiated {
            "Valid Markdown twin served via Accept: text/markdown".to_string()
        } else if has_md_route {
            format!("Valid Markdown twin served at {}", md_route_url)
        } else {
            "No Markdown twin detected".to_string()
        },
    );
    push(
        "html.linkAlternate",
        3,
        if has_link_alternate { "pass" } else { "fail" },
        if has_link_alternate { 3.0 } else { 0.0 },
        if has_link_alternate {
            "HTML/headers advertise rel=alternate text/markdown".to_string()
        } else {
            "No rel=alternate text/markdown link advertised".to_string()
        },
    );
    push(
        "site.llmsTxt",
        2,
        if llms.valid { "pass" } else { "fail" },
        if llms.valid { 2.0 } else { 0.0 },
        if llms.valid {
            format!("Valid /llms.txt ({} links)", llms.link_count)
        } else {
            "Missing or invalid /llms.txt".to_string()
        },
    );
    push(
        "html.vary",
        4,
        if vary_ok { "pass" } else { "fail" },
        if vary_ok { 4.0 } else { 0.0 },
        if vary_ok {
            "Vary: Accept header satisfied".to_string()
        } else {
            "Content-negotiated response missing Vary: Accept".to_string()
        },
    );
    push(
        "ai.manipulation",
        0,
        if pi_hits.is_empty() { "pass" } else { "review" },
        0.0,
        if pi_hits.is_empty() {
            "No prompt-injection directives detected".to_string()
        } else {
            format!("Detected suspicious instruction phrases: {}", pi_hits.join("; "))
        },
    );

    let applicable: f64 = checks.iter().map(|c| c.weight as f64).sum();
    let earned: f64 = checks.iter().map(|c| c.earned).sum();
    let score = if applicable > 0.0 {
        ((earned / applicable) * 100.0).round().clamp(0.0, 100.0) as u32
    } else {
        0
    };
    let tier = if score >= 80 {
        "Eligible"
    } else if score >= 50 {
        "Partially Eligible"
    } else {
        "Restricted"
    }
    .to_string();

    Ok(AeoReport {
        schema_version: SCAN_SCHEMA_VERSION,
        definitions_version: DEFINITIONS_VERSION.to_string(),
        axis: "aeo".to_string(),
        url: raw_url.to_string(),
        score,
        tier,
        elapsed_ms: started.elapsed().as_millis(),
        checks,
        robots,
        preview,
        llms,
        server_word_count,
    })
}
