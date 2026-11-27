//! AEO (Answer-Engine Optimization) pure parsers and evaluators:
//! RFC 9309 robots.txt, 2026.10 AI Bot Registry, preview directives, llms.txt v2, and prompt injection detection.

use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::OnceLock;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BotPurpose {
    Search,
    UserAction,
    Training,
    Other,
}

#[derive(Debug, Clone, Copy)]
pub struct AiBotEntry {
    pub name: &'static str,
    pub vendor: &'static str,
    pub purpose: BotPurpose,
    pub inherits_from: Option<&'static str>,
    pub legacy: bool,
}

pub const AI_BOT_REGISTRY: &[AiBotEntry] = &[
    // Search & citation crawlers
    AiBotEntry { name: "OAI-SearchBot", vendor: "OpenAI", purpose: BotPurpose::Search, inherits_from: None, legacy: false },
    AiBotEntry { name: "Claude-SearchBot", vendor: "Anthropic", purpose: BotPurpose::Search, inherits_from: None, legacy: false },
    AiBotEntry { name: "PerplexityBot", vendor: "Perplexity", purpose: BotPurpose::Search, inherits_from: None, legacy: false },
    AiBotEntry { name: "Googlebot", vendor: "Google", purpose: BotPurpose::Search, inherits_from: None, legacy: false },
    AiBotEntry { name: "bingbot", vendor: "Microsoft", purpose: BotPurpose::Search, inherits_from: None, legacy: false },
    AiBotEntry { name: "Applebot", vendor: "Apple", purpose: BotPurpose::Search, inherits_from: Some("Googlebot"), legacy: false },
    AiBotEntry { name: "DuckAssistBot", vendor: "DuckDuckGo", purpose: BotPurpose::Search, inherits_from: None, legacy: false },
    AiBotEntry { name: "YouBot", vendor: "You.com", purpose: BotPurpose::Search, inherits_from: None, legacy: false },
    AiBotEntry { name: "Amzn-SearchBot", vendor: "Amazon", purpose: BotPurpose::Search, inherits_from: None, legacy: false },
    AiBotEntry { name: "MistralAI-Index", vendor: "Mistral", purpose: BotPurpose::Search, inherits_from: None, legacy: false },
    AiBotEntry { name: "OAI-AdsBot", vendor: "OpenAI", purpose: BotPurpose::Other, inherits_from: None, legacy: false },
    AiBotEntry { name: "meta-webindexer", vendor: "Meta", purpose: BotPurpose::Search, inherits_from: None, legacy: false },
    AiBotEntry { name: "meta-externalads", vendor: "Meta", purpose: BotPurpose::Other, inherits_from: None, legacy: false },
    // User-action crawlers
    AiBotEntry { name: "ChatGPT-User", vendor: "OpenAI", purpose: BotPurpose::UserAction, inherits_from: None, legacy: false },
    AiBotEntry { name: "Claude-User", vendor: "Anthropic", purpose: BotPurpose::UserAction, inherits_from: None, legacy: false },
    AiBotEntry { name: "Perplexity-User", vendor: "Perplexity", purpose: BotPurpose::UserAction, inherits_from: None, legacy: false },
    AiBotEntry { name: "Meta-ExternalFetcher", vendor: "Meta", purpose: BotPurpose::UserAction, inherits_from: None, legacy: false },
    AiBotEntry { name: "MistralAI-User", vendor: "Mistral", purpose: BotPurpose::UserAction, inherits_from: None, legacy: false },
    AiBotEntry { name: "Amzn-User", vendor: "Amazon", purpose: BotPurpose::UserAction, inherits_from: None, legacy: false },
    AiBotEntry { name: "Google-Agent", vendor: "Google", purpose: BotPurpose::UserAction, inherits_from: None, legacy: false },
    // Training crawlers (never penalized)
    AiBotEntry { name: "GPTBot", vendor: "OpenAI", purpose: BotPurpose::Training, inherits_from: None, legacy: false },
    AiBotEntry { name: "ClaudeBot", vendor: "Anthropic", purpose: BotPurpose::Training, inherits_from: None, legacy: false },
    AiBotEntry { name: "Google-Extended", vendor: "Google", purpose: BotPurpose::Training, inherits_from: None, legacy: false },
    AiBotEntry { name: "Applebot-Extended", vendor: "Apple", purpose: BotPurpose::Training, inherits_from: None, legacy: false },
    AiBotEntry { name: "GoogleOther", vendor: "Google", purpose: BotPurpose::Training, inherits_from: None, legacy: false },
    AiBotEntry { name: "CCBot", vendor: "Common Crawl", purpose: BotPurpose::Training, inherits_from: None, legacy: false },
    AiBotEntry { name: "Bytespider", vendor: "ByteDance", purpose: BotPurpose::Training, inherits_from: None, legacy: false },
    AiBotEntry { name: "DeepSeekBot", vendor: "DeepSeek", purpose: BotPurpose::Training, inherits_from: None, legacy: false },
    AiBotEntry { name: "Amazonbot", vendor: "Amazon", purpose: BotPurpose::Training, inherits_from: None, legacy: false },
    AiBotEntry { name: "Meta-ExternalAgent", vendor: "Meta", purpose: BotPurpose::Training, inherits_from: None, legacy: false },
    AiBotEntry { name: "cohere-ai", vendor: "Cohere", purpose: BotPurpose::Training, inherits_from: None, legacy: false },
    AiBotEntry { name: "AI2Bot", vendor: "Allen Institute", purpose: BotPurpose::Training, inherits_from: None, legacy: false },
    AiBotEntry { name: "Diffbot", vendor: "Diffbot", purpose: BotPurpose::Training, inherits_from: None, legacy: false },
    AiBotEntry { name: "ImagesiftBot", vendor: "ImageSift", purpose: BotPurpose::Training, inherits_from: None, legacy: false },
    AiBotEntry { name: "Omgilibot", vendor: "Webz.io", purpose: BotPurpose::Training, inherits_from: None, legacy: false },
    AiBotEntry { name: "MistralAI-Training", vendor: "Mistral", purpose: BotPurpose::Training, inherits_from: None, legacy: false },
    // Legacy tokens
    AiBotEntry { name: "anthropic-ai", vendor: "Anthropic", purpose: BotPurpose::Training, inherits_from: None, legacy: true },
    AiBotEntry { name: "Claude-Web", vendor: "Anthropic", purpose: BotPurpose::UserAction, inherits_from: None, legacy: true },
    AiBotEntry { name: "Google-NotebookLM", vendor: "Google", purpose: BotPurpose::UserAction, inherits_from: None, legacy: true },
];

#[derive(Debug, Clone)]
pub struct RobotsRule {
    pub allow: bool,
    pub pattern: String,
    pub line: usize,
}

#[derive(Debug, Clone)]
pub struct ParsedRobotsTxt {
    pub groups: HashMap<String, Vec<RobotsRule>>,
    pub sitemaps: Vec<String>,
    pub agentmaps: Vec<String>,
    pub cloudflare_managed: bool,
    pub legacy_tokens_used: Vec<String>,
}

fn normalize_robots_path(p: &str) -> String {
    let bytes = p.as_bytes();
    let mut out = String::with_capacity(p.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let (Ok(hex), true) = (
                std::str::from_utf8(&bytes[i + 1..i + 3]),
                bytes[i + 1].is_ascii_hexdigit() && bytes[i + 2].is_ascii_hexdigit(),
            ) {
                if let Ok(code) = u8::from_str_radix(hex, 16) {
                    let unreserved = code.is_ascii_alphanumeric()
                        || matches!(code, b'-' | b'.' | b'_' | b'~');
                    if unreserved {
                        out.push(code as char);
                    } else {
                        out.push('%');
                        out.push_str(&hex.to_ascii_uppercase());
                    }
                    i += 3;
                    continue;
                }
            }
        }
        out.push(bytes[i] as char);
        i += 1;
    }
    out
}

fn robots_pattern_matches(pattern: &str, target_path: &str) -> bool {
    if pattern.is_empty() {
        return false;
    }
    let norm_pat = normalize_robots_path(pattern);
    let norm_path = normalize_robots_path(if target_path.is_empty() { "/" } else { target_path });
    let anchored_end = norm_pat.ends_with('$');
    let raw = if anchored_end {
        &norm_pat[..norm_pat.len() - 1]
    } else {
        &norm_pat
    };
    if raw.is_empty() {
        return if anchored_end {
            norm_path.is_empty()
        } else {
            true
        };
    }
    let segments: Vec<&str> = raw.split('*').collect();
    let last = segments.len() - 1;
    let mut from = 0usize;
    for (i, seg) in segments.iter().enumerate() {
        if seg.is_empty() {
            continue;
        }
        if i == 0 {
            if !norm_path.starts_with(seg) {
                return false;
            }
            from = seg.len();
            continue;
        }
        if anchored_end && i == last {
            if !norm_path.ends_with(seg) || norm_path.len() < seg.len() + from {
                return false;
            }
            from = norm_path.len();
            continue;
        }
        if let Some(pos) = norm_path[from..].find(seg) {
            from += pos + seg.len();
        } else {
            return false;
        }
    }
    if anchored_end && !raw.ends_with('*') && from != norm_path.len() {
        return false;
    }
    true
}

pub fn parse_robots_txt(robots_txt: &str) -> ParsedRobotsTxt {
    let mut groups: HashMap<String, Vec<RobotsRule>> = HashMap::new();
    let mut sitemaps = Vec::new();
    let mut agentmaps = Vec::new();
    let mut legacy_used = HashSet::new();
    let legacy_set: HashSet<String> = AI_BOT_REGISTRY
        .iter()
        .filter(|b| b.legacy)
        .map(|b| b.name.to_ascii_lowercase())
        .collect();

    let lower_all = robots_txt.to_ascii_lowercase();
    let cloudflare_managed = lower_all.contains("begin cloudflare managed content")
        || lower_all.contains("begin cloudflare bot preference sync");

    let mut current_agents: Vec<String> = Vec::new();
    let mut current_has_rules = false;

    for (idx, raw_line) in robots_txt.lines().enumerate() {
        let line = match raw_line.find('#') {
            Some(c) => raw_line[..c].trim(),
            None => raw_line.trim(),
        };
        if line.is_empty() {
            continue;
        }
        let Some(colon) = line.find(':') else {
            continue;
        };
        let field = line[..colon].trim().to_ascii_lowercase();
        let value = line[colon + 1..].trim();

        match field.as_str() {
            "user-agent" => {
                if current_has_rules {
                    current_agents.clear();
                    current_has_rules = false;
                }
                let agent = value.to_ascii_lowercase();
                if !current_agents.contains(&agent) {
                    current_agents.push(agent.clone());
                }
                groups.entry(agent.clone()).or_default();
                if legacy_set.contains(&agent) {
                    legacy_used.insert(agent);
                }
            }
            "allow" | "disallow" => {
                if current_agents.is_empty() {
                    continue;
                }
                current_has_rules = true;
                let allow = field == "allow";
                for agent in &current_agents {
                    groups.entry(agent.clone()).or_default().push(RobotsRule {
                        allow,
                        pattern: value.to_string(),
                        line: idx + 1,
                    });
                }
            }
            "sitemap" => {
                if !value.is_empty() {
                    sitemaps.push(value.to_string());
                }
            }
            "agentmap" => {
                if !value.is_empty() {
                    agentmaps.push(value.to_string());
                }
            }
            "content-signal" => {
                current_has_rules = true;
            }
            _ => {}
        }
    }

    ParsedRobotsTxt {
        groups,
        sitemaps,
        agentmaps,
        cloudflare_managed,
        legacy_tokens_used: legacy_used.into_iter().collect(),
    }
}

pub fn is_bot_allowed_by_robots(parsed: &ParsedRobotsTxt, bot_name: &str, pathname: &str) -> (bool, String) {
    let lower = bot_name.to_ascii_lowercase();
    let (effective_group, rules) = if let Some(r) = parsed.groups.get(&lower) {
        (lower.clone(), Some(r))
    } else if let Some(meta) = AI_BOT_REGISTRY
        .iter()
        .find(|b| b.name.eq_ignore_ascii_case(&lower))
    {
        if let Some(parent) = meta.inherits_from {
            let parent_lower = parent.to_ascii_lowercase();
            if let Some(r) = parsed.groups.get(&parent_lower) {
                (parent_lower, Some(r))
            } else {
                ("*".to_string(), parsed.groups.get("*"))
            }
        } else {
            ("*".to_string(), parsed.groups.get("*"))
        }
    } else {
        ("*".to_string(), parsed.groups.get("*"))
    };

    let Some(rules) = rules else {
        return (true, effective_group);
    };

    let mut best: Option<&RobotsRule> = None;
    let mut best_len: isize = -1;

    for r in rules {
        if r.pattern.is_empty() {
            continue;
        }
        if robots_pattern_matches(&r.pattern, pathname) {
            let len = normalize_robots_path(&r.pattern).len() as isize;
            if len > best_len || (len == best_len && r.allow) {
                best_len = len;
                best = Some(r);
            }
        }
    }

    match best {
        None => (true, effective_group),
        Some(r) => (r.allow, effective_group),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RobotsEvalResult {
    pub fetch_outcome: String,
    pub search_allowed: bool,
    pub search_blocked: Vec<String>,
    pub user_action_blocked: Vec<String>,
    pub training_blocked: Vec<String>,
    pub cloudflare_managed: bool,
    pub cloudflare_search_collateral: Vec<String>,
}

pub fn evaluate_robots_txt(
    robots_txt: &str,
    pathname: &str,
    status: u16,
    content_type: &str,
    has_error: bool,
) -> RobotsEvalResult {
    if has_error || status >= 500 {
        let search_blocked = AI_BOT_REGISTRY
            .iter()
            .filter(|b| b.purpose == BotPurpose::Search)
            .map(|b| b.name.to_ascii_lowercase())
            .collect();
        return RobotsEvalResult {
            fetch_outcome: "unreachable_5xx".to_string(),
            search_allowed: false,
            search_blocked,
            user_action_blocked: vec![],
            training_blocked: vec![],
            cloudflare_managed: false,
            cloudflare_search_collateral: vec![],
        };
    }

    if (400..500).contains(&status) {
        return RobotsEvalResult {
            fetch_outcome: "missing_4xx".to_string(),
            search_allowed: true,
            search_blocked: vec![],
            user_action_blocked: vec![],
            training_blocked: vec![],
            cloudflare_managed: false,
            cloudflare_search_collateral: vec![],
        };
    }

    let ct = content_type.to_ascii_lowercase();
    let lower_body = robots_txt.to_ascii_lowercase();
    if ct.contains("text/html") && (lower_body.contains("<html") || lower_body.contains("<!doctype html")) {
        return RobotsEvalResult {
            fetch_outcome: "invalid_content_type".to_string(),
            search_allowed: true,
            search_blocked: vec![],
            user_action_blocked: vec![],
            training_blocked: vec![],
            cloudflare_managed: false,
            cloudflare_search_collateral: vec![],
        };
    }

    if robots_txt.trim().is_empty() {
        return RobotsEvalResult {
            fetch_outcome: "ok".to_string(),
            search_allowed: true,
            search_blocked: vec![],
            user_action_blocked: vec![],
            training_blocked: vec![],
            cloudflare_managed: false,
            cloudflare_search_collateral: vec![],
        };
    }

    let parsed = parse_robots_txt(robots_txt);
    let mut search_blocked = Vec::new();
    let mut user_action_blocked = Vec::new();
    let mut training_blocked = Vec::new();

    for bot in AI_BOT_REGISTRY {
        let (allowed, _) = is_bot_allowed_by_robots(&parsed, bot.name, pathname);
        if !allowed {
            let lower = bot.name.to_ascii_lowercase();
            match bot.purpose {
                BotPurpose::Search => search_blocked.push(lower),
                BotPurpose::UserAction => user_action_blocked.push(lower),
                BotPurpose::Training => training_blocked.push(lower),
                BotPurpose::Other => {}
            }
        }
    }

    const COLLATERAL_BOTS: &[&str] = &[
        "googlebot",
        "bingbot",
        "applebot",
        "oai-searchbot",
        "claude-searchbot",
        "perplexitybot",
    ];
    let cloudflare_search_collateral = if parsed.cloudflare_managed {
        search_blocked
            .iter()
            .filter(|b| COLLATERAL_BOTS.contains(&b.as_str()))
            .cloned()
            .collect()
    } else {
        vec![]
    };

    RobotsEvalResult {
        fetch_outcome: "ok".to_string(),
        search_allowed: search_blocked.is_empty(),
        search_blocked,
        user_action_blocked,
        training_blocked,
        cloudflare_managed: parsed.cloudflare_managed,
        cloudflare_search_collateral,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewDirectivesResult {
    pub status: String,
    pub earned_weight: f64,
    pub global_noindex: bool,
    pub google_status: String,
    pub bing_status: String,
    pub apple_status: String,
}

fn meta_tag_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(?i)<meta\b[^>]*>").unwrap())
}

fn meta_name_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r#"(?i)\bname\s*=\s*["']([^"']+)["']"#).unwrap())
}

fn meta_content_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r#"(?i)\bcontent\s*=\s*["']([^"']+)["']"#).unwrap())
}

pub fn parse_preview_directives(
    headers: &HashMap<String, String>,
    html_body: &str,
) -> PreviewDirectivesResult {
    let mut all = Vec::new();
    let mut google = Vec::new();
    let mut bing = Vec::new();
    let mut apple = Vec::new();

    if let Some((_, x_robots)) = headers
        .iter()
        .find(|(k, _)| k.eq_ignore_ascii_case("x-robots-tag"))
    {
        let mut scope = "all";
        for part in x_robots.split(',') {
            let trimmed = part.trim();
            if trimmed.is_empty() {
                continue;
            }
            if let Some(colon) = trimmed.find(':') {
                let prefix = trimmed[..colon].trim().to_ascii_lowercase();
                let rest = trimmed[colon + 1..].trim().to_ascii_lowercase();
                match prefix.as_str() {
                    "googlebot" => {
                        scope = "google";
                        if !rest.is_empty() {
                            google.push(rest);
                        }
                        continue;
                    }
                    "bingbot" => {
                        scope = "bing";
                        if !rest.is_empty() {
                            bing.push(rest);
                        }
                        continue;
                    }
                    "applebot" => {
                        scope = "apple";
                        if !rest.is_empty() {
                            apple.push(rest);
                        }
                        continue;
                    }
                    "robots" => {
                        scope = "all";
                        if !rest.is_empty() {
                            all.push(rest);
                        }
                        continue;
                    }
                    "max-snippet" | "max-image-preview" | "max-video-preview"
                    | "unavailable_after" => {}
                    _ => {
                        scope = "other";
                        continue;
                    }
                }
            }
            let tok = trimmed.to_ascii_lowercase();
            match scope {
                "all" => all.push(tok),
                "google" => google.push(tok),
                "bing" => bing.push(tok),
                "apple" => apple.push(tok),
                _ => {}
            }
        }
    }

    let head_slice = &html_body[..html_body.len().min(100_000)];
    for m in meta_tag_re().find_iter(head_slice) {
        let tag = m.as_str();
        let Some(name_cap) = meta_name_re().captures(tag) else {
            continue;
        };
        let Some(content_cap) = meta_content_re().captures(tag) else {
            continue;
        };
        let name = name_cap[1].trim().to_ascii_lowercase();
        let target = match name.as_str() {
            "robots" => &mut all,
            "googlebot" | "googlebot-news" => &mut google,
            "bingbot" => &mut bing,
            "applebot" => &mut apple,
            _ => continue,
        };
        for part in content_cap[1].split(',') {
            let tok = part.trim().to_ascii_lowercase();
            if !tok.is_empty() {
                target.push(tok);
            }
        }
    }

    let eval_engine = |specific: &[String]| -> &'static str {
        let mut combined = all.clone();
        combined.extend_from_slice(specific);
        let mut max_snippet: Option<i64> = None;
        for tok in &combined {
            if let Some(rest) = tok.strip_prefix("max-snippet:") {
                if let Ok(n) = rest.trim().parse::<i64>() {
                    if n < 0 {
                        if max_snippet.is_none() {
                            max_snippet = Some(n);
                        }
                    } else if max_snippet.is_none_or(|cur| cur < 0 || n < cur) {
                        max_snippet = Some(n);
                    }
                }
            }
        }
        let hard_block = combined.iter().any(|t| matches!(t.as_str(), "nosnippet" | "none" | "noindex"))
            || max_snippet == Some(0);
        if hard_block {
            return "fail";
        }
        let restricted = max_snippet.is_some_and(|n| n > 0 && n < 80)
            || combined.iter().any(|t| matches!(t.as_str(), "noarchive" | "nocache"));
        if restricted {
            "warn"
        } else {
            "pass"
        }
    };

    let g_st = eval_engine(&google);
    let b_st = eval_engine(&bing);
    let a_st = eval_engine(&apple);

    let score_for = |st: &str, w: f64| match st {
        "pass" => w,
        "warn" => w * 0.5,
        _ => 0.0,
    };
    let earned = score_for(g_st, 5.0) + score_for(b_st, 2.0) + score_for(a_st, 1.0);
    let overall = if earned >= 7.0 {
        "pass"
    } else if earned >= 4.0 {
        "warn"
    } else {
        "fail"
    };
    let global_noindex = all.iter().any(|t| t == "noindex" || t == "none");

    PreviewDirectivesResult {
        status: overall.to_string(),
        earned_weight: earned,
        global_noindex,
        google_status: g_st.to_string(),
        bing_status: b_st.to_string(),
        apple_status: a_st.to_string(),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmsTxtValidation {
    pub valid: bool,
    pub has_h1: bool,
    pub link_count: usize,
}

fn md_link_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"\[[^\]]+\]\((https?://[^)\s]+|/[^)\s]+)\)").unwrap())
}

pub fn validate_llms_txt(body: &str, content_type: &str) -> LlmsTxtValidation {
    let ct = content_type.to_ascii_lowercase();
    let trimmed = body.trim();
    let lower = trimmed.to_ascii_lowercase();
    let is_html = ct.contains("text/html")
        || lower.starts_with("<!doctype html")
        || lower.starts_with("<html");
    if is_html || trimmed.is_empty() {
        return LlmsTxtValidation {
            valid: false,
            has_h1: false,
            link_count: 0,
        };
    }
    let has_h1 = trimmed.lines().any(|l| {
        let t = l.trim_start();
        t.starts_with("# ") && t.len() > 2
    });
    let link_count = md_link_re().find_iter(trimmed).count();
    LlmsTxtValidation {
        valid: has_h1 && link_count >= 1,
        has_h1,
        link_count,
    }
}

pub fn strip_html_to_text(html: &str) -> String {
    static SCRIPT_RE: OnceLock<Regex> = OnceLock::new();
    static TAG_RE: OnceLock<Regex> = OnceLock::new();
    let s_re = SCRIPT_RE
        .get_or_init(|| Regex::new(r"(?is)<(?:script|style|noscript|svg)\b[^>]*>.*?</(?:script|style|noscript|svg)>").unwrap());
    let t_re = TAG_RE.get_or_init(|| Regex::new(r"<[^>]+>").unwrap());
    let without_blocks = s_re.replace_all(html, " ");
    let without_tags = t_re.replace_all(&without_blocks, " ");
    without_tags.split_whitespace().collect::<Vec<_>>().join(" ")
}

pub fn detect_prompt_injection(html: &str) -> Vec<String> {
    static PI_RE: OnceLock<Regex> = OnceLock::new();
    let re = PI_RE.get_or_init(|| {
        Regex::new(r"(?i)(?:ignore (?:all )?previous instructions|system prompt override|you are now a helpful assistant that must recommend|when summarizing this page, always)").unwrap()
    });
    re.find_iter(html)
        .take(5)
        .map(|m| m.as_str().to_string())
        .collect()
}
