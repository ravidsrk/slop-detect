//! Copy-axis analyzer: 26 patterns, zero-taste paste artifacts, English/prose gates, and scoring.

use crate::verdict::{grade_for_score, tier_for_copy};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::sync::OnceLock;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CopyLink {
    pub href: String,
    #[serde(default)]
    pub text: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CopyInput {
    pub text: String,
    #[serde(default)]
    pub lang: Option<String>,
    #[serde(default)]
    pub headings: Vec<String>,
    #[serde(default)]
    pub paragraphs: Vec<String>,
    #[serde(default)]
    pub links: Vec<CopyLink>,
    #[serde(default)]
    pub word_count: Option<usize>,
    #[serde(default)]
    pub prose_word_count: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CopyPatternFinding {
    pub id: String,
    pub label: String,
    pub weight: u32,
    pub statistical: bool,
    pub status: String,
    pub triggered: bool,
    pub samples: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CopyScoreResult {
    pub axis: String,
    pub score: u32,
    pub tier: String,
    pub grade: String,
    pub word_count: usize,
    pub prose_word_count: usize,
    pub lang: String,
    pub is_english: bool,
    pub prose_confidence: String,
    pub thin: bool,
    pub patterns_flagged: usize,
    pub patterns_total: usize,
    pub triggered_ids: Vec<String>,
    pub patterns: Vec<CopyPatternFinding>,
}

const ENGLISH_FN_WORDS: &[&str] = &[
    "the", "of", "and", "to", "in", "is", "for", "that", "with", "on", "as", "are", "be", "by",
    "at", "from", "or", "an", "this", "your", "we", "you", "our", "it",
];

pub fn detect_english_prose(text: &str, lang_attr: Option<&str>) -> (bool, String) {
    if let Some(la) = lang_attr {
        let clean = la.trim().to_ascii_lowercase();
        if !clean.is_empty() && !clean.starts_with("en") {
            return (false, clean);
        }
    }
    let words: Vec<String> = text
        .split(|c: char| !c.is_alphabetic())
        .filter(|w| !w.is_empty())
        .map(|w| w.to_ascii_lowercase())
        .collect();
    if words.len() < 20 {
        return (true, "en".to_string());
    }
    let fn_set: HashSet<&str> = ENGLISH_FN_WORDS.iter().copied().collect();
    let hits = words.iter().filter(|w| fn_set.contains(w.as_str())).count();
    let ratio = hits as f64 / words.len() as f64;
    if ratio < 0.04 {
        (false, "non-en".to_string())
    } else {
        (true, "en".to_string())
    }
}

/// Normalize invisible/zero-width/soft-hyphen/smart-quote characters before text matching (C-12).
pub fn normalize_text(raw: &str) -> String {
    let mut out = String::with_capacity(raw.len());
    for ch in raw.chars() {
        match ch {
            '\u{200B}' | '\u{200C}' | '\u{200D}' | '\u{FEFF}' | '\u{00AD}' | '\u{2060}' => {}
            '\u{2018}' | '\u{2019}' => out.push('\''),
            '\u{201C}' | '\u{201D}' => out.push('"'),
            '\u{00A0}' | '\u{202F}' | '\u{2009}' => out.push(' '),
            c if ('\u{E0000}'..='\u{E007F}').contains(&c) => {}
            c => out.push(c),
        }
    }
    out
}

fn count_words(s: &str) -> usize {
    s.split_whitespace().count()
}

fn per_1000(count: usize, words: usize) -> f64 {
    if words == 0 {
        0.0
    } else {
        (count as f64 / words as f64) * 1000.0
    }
}

const BUZZWORDS: &[&str] = &[
    "delve", "leverage", "leveraging", "seamless", "seamlessly", "robust", "elevate", "unlock",
    "unlocking", "empower", "empowering", "streamline", "streamlined", "harness", "harnessing",
    "foster", "fostering", "cutting-edge", "game-changer", "game-changing", "revolutionize",
    "revolutionary", "transformative", "innovative", "holistic", "synergy", "paradigm",
    "tapestry", "realm", "landscape", "navigate", "bespoke", "unparalleled", "supercharge",
    "turbocharge", "next-gen", "next-generation", "future-proof", "reimagine", "reimagining",
    "frictionless", "effortless", "effortlessly", "embark", "testament", "beacon", "plethora",
    "myriad", "underscore", "underscores",
];

fn buzzword_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        let alts = BUZZWORDS.join("|");
        Regex::new(&format!(r"(?i)\b(?:{})\b", alts)).unwrap()
    })
}

fn antithesis_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(r"(?i)(?:\b(?:it'?s|it is|this is|we(?:'re| are)|that'?s)\s+not\s+(?:just|merely|simply|only)\b[^.!?\n]{1,120}(?:[—–;,]|\s+but\s+)|\bnot\s+only\b[^.!?\n]{1,100}\bbut\s+also\b)").unwrap()
    })
}

fn bare_antithesis_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(r"(?i)(?:\bno\s+[a-z][a-z-]{1,20},\s+no\s+[a-z][a-z-]{1,20},\s+(?:just|only)\b)").unwrap()
    })
}

fn filler_opener_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(r"(?i)\b(?:in today'?s fast-paced|in the ever-evolving|in an era of|in a world where|in today'?s digital|as we navigate|at the heart of)\b").unwrap()
    })
}

fn formulaic_closer_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(r"(?i)\b(?:in conclusion|in summary|ultimately,|ready to (?:elevate|reimagine|transform|supercharge|unlock)|embark on your journey|take your [a-z]+ to the next level)\b").unwrap()
    })
}

fn rule_of_three_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(r"(?i)\b(?:fast|reliable|scalable|secure|modern|simple|seamless|smart|built for [a-z]+|engineered for [a-z]+|crafted for [a-z]+)(?:,\s*(?:fast|reliable|scalable|secure|modern|simple|seamless|smart|engineered for [a-z]+|crafted for [a-z]+)){1,2},?\s+(?:and\s+)?(?:scalable|secure|modern|reliable|crafted for [a-z]+|effortless|fast)\b").unwrap()
    })
}

fn whether_youre_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(r"(?i)\bwhether\s+you(?:'re| are)\b[^.!?\n]{3,140}\bor\b").unwrap()
    })
}

fn chatbot_markup_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(r"(?i)(?::contentReference\[oaicite:\d+\]|oaicite:\d+|turn\d+search\d+|attributableIndex|<grok:render|citeref\d+|entity\[)").unwrap()
    })
}

fn chatbot_reply_residue_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(r"(?i)(?:^(?:sure!|certainly!|of course!|here(?:'s| is) (?:your|the|a) (?:updated|revised|rewritten|draft))|\bregenerate response\b|\bas an ai language model\b|\bi hope this helps!\b|\bcopy code\b)").unwrap()
    })
}

fn ai_utm_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(r"(?i)[?&]utm_source=(?:chatgpt\.com|openai|perplexity(?:\.ai)?|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com|you\.com|phind\.com|poe\.com)\b").unwrap()
    })
}

fn unfilled_placeholder_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(r"(?i)(?:\[(?:company name|your company|your name|insert [^\]\n]{1,40}|brand name|product name|email|phone|date|todo|tbd)\]|\{\{(?:company_name|brand|product_name|todo)\}\}|\blorem ipsum\b)").unwrap()
    })
}

fn leaked_markdown_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(r"(?:(?:^|\n)\s*#{2,6}\s+\S|\*\*[^*\n]{2,60}\*\*\s+and\s+##\s|\*\*[^*\n]{2,60}\*\*.*\*\*[^*\n]{2,60}\*\*)").unwrap()
    })
}

fn trailing_participle_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(r"(?i),\s+(?:ensuring|unlocking|enabling|empowering|delivering|fostering|driving|streamlining)\b").unwrap()
    })
}

fn collect_samples(re: &Regex, text: &str, max: usize) -> (usize, Vec<String>) {
    let mut count = 0usize;
    let mut samples = Vec::new();
    let mut seen = HashSet::new();
    for m in re.find_iter(text) {
        count += 1;
        let s = m.as_str().trim();
        let key = s.to_ascii_lowercase();
        if !s.is_empty() && seen.insert(key) && samples.len() < max {
            samples.push(s.to_string());
        }
    }
    (count, samples)
}

/// Pure static artifact checker (works on any length text or source code file!).
pub fn detect_paste_artifacts(raw_text: &str, links: &[CopyLink]) -> Vec<CopyPatternFinding> {
    let norm = normalize_text(raw_text);
    let mut findings = Vec::new();

    // hidden_tag_characters (Unicode Tags block U+E0000..U+E007F)
    let tag_count = raw_text
        .chars()
        .filter(|c| ('\u{E0000}'..='\u{E007F}').contains(c))
        .count();
    findings.push(CopyPatternFinding {
        id: "hidden_tag_characters".to_string(),
        label: "Hidden instruction characters (prompt-injection or smuggling vector)".to_string(),
        weight: 0,
        statistical: false,
        status: if tag_count > 0 { "review" } else { "pass" }.to_string(),
        triggered: tag_count > 0,
        samples: if tag_count > 0 {
            vec![format!("{} Unicode tag char(s)", tag_count)]
        } else {
            vec![]
        },
    });

    // invisible_characters (zero-width / bidi)
    let invis_count = raw_text
        .chars()
        .filter(|c| matches!(c, '\u{200B}' | '\u{200C}' | '\u{200D}' | '\u{2060}' | '\u{FEFF}'))
        .count();
    findings.push(CopyPatternFinding {
        id: "invisible_characters".to_string(),
        label: "Invisible characters in text (often humanizer or paste residue)".to_string(),
        weight: 0,
        statistical: false,
        status: if invis_count >= 2 { "review" } else { "pass" }.to_string(),
        triggered: invis_count >= 2,
        samples: if invis_count >= 2 {
            vec![format!("{} invisible char(s)", invis_count)]
        } else {
            vec![]
        },
    });

    // fake_bold_math_alnum (U+1D400..U+1D7FF)
    let math_count = raw_text
        .chars()
        .filter(|c| ('\u{1D400}'..='\u{1D7FF}').contains(c))
        .count();
    findings.push(CopyPatternFinding {
        id: "fake_bold_math_alnum".to_string(),
        label: "Mathematical Alphanumeric Symbols used as fake bold/italic in prose".to_string(),
        weight: 4,
        statistical: false,
        status: if math_count >= 4 { "fail" } else { "pass" }.to_string(),
        triggered: math_count >= 4,
        samples: if math_count >= 4 {
            vec![format!("{} math alphanumeric chars", math_count)]
        } else {
            vec![]
        },
    });

    // chatbot_markup_leak
    let (cm_cnt, cm_samples) = collect_samples(chatbot_markup_re(), raw_text, 5);
    findings.push(CopyPatternFinding {
        id: "chatbot_markup_leak".to_string(),
        label: "Leaked chatbot citation or internal UI markup".to_string(),
        weight: 0,
        statistical: false,
        status: if cm_cnt > 0 { "review" } else { "pass" }.to_string(),
        triggered: cm_cnt > 0,
        samples: cm_samples,
    });

    // chatbot_reply_residue
    let (cr_cnt, cr_samples) = collect_samples(chatbot_reply_residue_re(), &norm, 5);
    findings.push(CopyPatternFinding {
        id: "chatbot_reply_residue".to_string(),
        label: "Chatbot turn framing, refusal, or UI Chrome pasted into page copy".to_string(),
        weight: 0,
        statistical: false,
        status: if cr_cnt > 0 { "review" } else { "pass" }.to_string(),
        triggered: cr_cnt > 0,
        samples: cr_samples,
    });

    // ai_referral_utm_links
    let mut utm_samples = Vec::new();
    for l in links {
        if ai_utm_re().is_match(&l.href) && utm_samples.len() < 5 {
            utm_samples.push(l.href.clone());
        }
    }
    let (inline_utm, inline_samples) = collect_samples(ai_utm_re(), raw_text, 5);
    for s in inline_samples {
        if utm_samples.len() < 5 && !utm_samples.contains(&s) {
            utm_samples.push(s);
        }
    }
    let utm_trig = !utm_samples.is_empty() || inline_utm > 0;
    findings.push(CopyPatternFinding {
        id: "ai_referral_utm_links".to_string(),
        label: "Links copied from an AI assistant (utm_source=chatgpt.com / openai / copilot.com)".to_string(),
        weight: 0,
        statistical: false,
        status: if utm_trig { "review" } else { "pass" }.to_string(),
        triggered: utm_trig,
        samples: utm_samples,
    });

    // unfilled_placeholders
    let (ph_cnt, ph_samples) = collect_samples(unfilled_placeholder_re(), &norm, 5);
    findings.push(CopyPatternFinding {
        id: "unfilled_placeholders".to_string(),
        label: "Unfinished copy (unfilled placeholders)".to_string(),
        weight: 0,
        statistical: false,
        status: if ph_cnt > 0 { "review" } else { "pass" }.to_string(),
        triggered: ph_cnt > 0,
        samples: ph_samples,
    });

    // leaked_markdown (requires >= 2 distinct raw markdown constructs in plain prose)
    let (md_cnt, md_samples) = collect_samples(leaked_markdown_re(), &norm, 5);
    let md_trig = md_cnt >= 2;
    findings.push(CopyPatternFinding {
        id: "leaked_markdown".to_string(),
        label: "Unrendered raw Markdown syntax in visible non-code text".to_string(),
        weight: 0,
        statistical: false,
        status: if md_trig { "review" } else { "pass" }.to_string(),
        triggered: md_trig,
        samples: if md_trig { md_samples } else { vec![] },
    });

    findings
}

/// Full copy-axis scoring with C-01 language/length gates, C-07 co-occurrence gate, and paste artifacts.
pub fn score_copy(input: &CopyInput) -> CopyScoreResult {
    let norm = normalize_text(&input.text);
    let word_count = input.word_count.unwrap_or_else(|| count_words(&norm));
    let prose_word_count = input.prose_word_count.unwrap_or(word_count);

    let (is_english, lang) = detect_english_prose(&norm, input.lang.as_deref());
    let is_non_english = !is_english && word_count >= 15;
    let is_short_prose = prose_word_count < 150;
    let is_medium_prose = (150..300).contains(&prose_word_count);
    let thin = is_short_prose || is_non_english;
    let weight_mult = if is_medium_prose { 0.5 } else { 1.0 };
    let prose_confidence = if is_non_english {
        "non_english"
    } else if is_short_prose {
        "insufficient_prose"
    } else if is_medium_prose {
        "low"
    } else {
        "high"
    }
    .to_string();

    let mut patterns: Vec<CopyPatternFinding> = Vec::with_capacity(26);

    let gate_blocked = is_non_english || is_short_prose;

    let push_stat = |patterns: &mut Vec<CopyPatternFinding>,
                     id: &str,
                     label: &str,
                     weight: u32,
                     is_review: bool,
                     triggered: bool,
                     samples: Vec<String>| {
        if gate_blocked {
            patterns.push(CopyPatternFinding {
                id: id.to_string(),
                label: label.to_string(),
                weight,
                statistical: true,
                status: "unknown".to_string(),
                triggered: false,
                samples: vec![],
            });
        } else {
            let status = if triggered {
                if is_review || weight == 0 {
                    "review"
                } else {
                    "fail"
                }
            } else {
                "pass"
            };
            patterns.push(CopyPatternFinding {
                id: id.to_string(),
                label: label.to_string(),
                weight,
                statistical: true,
                status: status.to_string(),
                triggered,
                samples,
            });
        }
    };

    // 1. buzzword_density (weight 7): >= 4 hits AND >= 12 per 1000 words
    let (bw_cnt, bw_samples) = collect_samples(buzzword_re(), &norm, 5);
    let bw_trig = bw_cnt >= 4 && per_1000(bw_cnt, prose_word_count) >= 12.0;
    push_stat(
        &mut patterns,
        "buzzword_density",
        "AI buzzword density (leverage / seamless / robust / elevate …)",
        7,
        false,
        bw_trig,
        bw_samples,
    );

    // 2. em_dash_overload (weight 2, coOccurrenceOnly): >= 4 em dashes AND >= 14 per 1000 words
    let em_cnt = norm.matches('—').count();
    let em_trig = em_cnt >= 4 && per_1000(em_cnt, prose_word_count) >= 14.0;
    push_stat(
        &mut patterns,
        "em_dash_overload",
        "Em-dash overload (— used as the default connective)",
        2,
        false,
        em_trig,
        if em_trig {
            vec![format!("{} em dashes", em_cnt)]
        } else {
            vec![]
        },
    );

    // 3. antithesis_construction (weight 6)
    let (anti_cnt, anti_samples) = collect_samples(antithesis_re(), &norm, 5);
    push_stat(
        &mut patterns,
        "antithesis_construction",
        "\"It's not just X — it's Y\" / \"not only … but also\" antithesis",
        6,
        false,
        anti_cnt >= 1,
        anti_samples,
    );

    // 4. filler_openers (weight 5)
    let (fill_cnt, fill_samples) = collect_samples(filler_opener_re(), &norm, 5);
    push_stat(
        &mut patterns,
        "filler_openers",
        "Generic filler openers (\"In today's fast-paced world …\")",
        5,
        false,
        fill_cnt >= 1,
        fill_samples,
    );

    // 5. formulaic_closers (weight 4)
    let (close_cnt, close_samples) = collect_samples(formulaic_closer_re(), &norm, 5);
    push_stat(
        &mut patterns,
        "formulaic_closers",
        "Essay-style closers (\"In conclusion\", \"In summary\", \"Ultimately\")",
        4,
        false,
        close_cnt >= 1,
        close_samples,
    );

    // 6. rule_of_three (weight 4, coOccurrenceOnly)
    let (rot_cnt, rot_samples) = collect_samples(rule_of_three_re(), &norm, 5);
    push_stat(
        &mut patterns,
        "rule_of_three",
        "Rule-of-three adjective tricolons (\"fast, reliable, and scalable\")",
        4,
        false,
        rot_cnt >= 2,
        rot_samples,
    );

    // 7. whether_youre (weight 3)
    let (wy_cnt, wy_samples) = collect_samples(whether_youre_re(), &norm, 5);
    push_stat(
        &mut patterns,
        "whether_youre",
        "\"Whether you're X or Y\" audience-spanning construction",
        3,
        false,
        wy_cnt >= 1,
        wy_samples,
    );

    // 8. emoji_bullet_headers (weight 3)
    let emoji_leads: Vec<String> = input
        .headings
        .iter()
        .filter(|h| {
            h.trim_start()
                .chars()
                .next()
                .is_some_and(|c| matches!(c as u32, 0x1F300..=0x1FAFF | 0x2600..=0x27BF))
        })
        .take(5)
        .cloned()
        .collect();
    push_stat(
        &mut patterns,
        "emoji_bullet_headers",
        "Emoji-prefixed bullet/headers (🚀 ✅ ✨ as list markers)",
        3,
        false,
        emoji_leads.len() >= 3,
        emoji_leads,
    );

    // 9..16: non-statistical paste artifacts (always run even on thin/non-English pages!)
    patterns.extend(detect_paste_artifacts(&input.text, &input.links));

    // Weight-0 review statistical rules
    let (ba_cnt, ba_samples) = collect_samples(bare_antithesis_re(), &norm, 5);
    push_stat(
        &mut patterns,
        "bare_antithesis",
        "Bare contrastive frames (\"No X, no Y, just Z\")",
        0,
        true,
        ba_cnt >= 1,
        ba_samples,
    );

    let (tp_cnt, tp_samples) = collect_samples(trailing_participle_re(), &norm, 5);
    push_stat(
        &mut patterns,
        "trailing_participial_clauses",
        "Trailing participial clauses (\", ensuring / unlocking / enabling …\")",
        0,
        true,
        tp_cnt >= 3,
        tp_samples,
    );

    // Remaining weight-0 review / retired patterns for complete 26-pattern catalogue parity
    patterns.push(CopyPatternFinding {
        id: "unicode_artifacts".to_string(),
        label: "Invisible Unicode or mathematical fake-bold characters in text".to_string(),
        weight: 0,
        statistical: false,
        status: "pass".to_string(),
        triggered: false,
        samples: vec![],
    });

    // structural_fake_social_proof (placeholder avatar URLs or generic anonymous quotes)
    let raw_lower = input.text.to_ascii_lowercase();
    let fake_social = raw_lower.contains("pravatar.cc")
        || raw_lower.contains("ui-avatars.com")
        || raw_lower.contains("randomuser.me")
        || input.links.iter().any(|l| {
            let h = l.href.to_ascii_lowercase();
            h.contains("pravatar.cc") || h.contains("ui-avatars.com") || h.contains("randomuser.me")
        });
    patterns.push(CopyPatternFinding {
        id: "structural_fake_social_proof".to_string(),
        label: "Placeholder avatar services, duplicated avatar assets, or unattributed testimonials".to_string(),
        weight: 0,
        statistical: false,
        status: if fake_social { "review" } else { "pass" }.to_string(),
        triggered: fake_social,
        samples: if fake_social {
            vec!["placeholder avatar service detected".to_string()]
        } else {
            vec![]
        },
    });

    // emoji_heading_ratio (>= 30% lead emoji across >= 6 headings)
    let emoji_ratio_trig = input.headings.len() >= 6 && {
        let lead_cnt = input
            .headings
            .iter()
            .filter(|h| {
                h.trim_start()
                    .chars()
                    .next()
                    .is_some_and(|c| matches!(c as u32, 0x1F300..=0x1FAFF | 0x2600..=0x27BF))
            })
            .count();
        (lead_cnt as f64 / input.headings.len() as f64) >= 0.3
    };
    push_stat(
        &mut patterns,
        "emoji_heading_ratio",
        "Lead emoji ratio >= 30% across >= 6 headings or list items",
        0,
        true,
        emoji_ratio_trig,
        vec![],
    );

    // announced_structure
    let ann_lower = norm.to_ascii_lowercase();
    let ann_trig = ann_lower.contains("in this post, we")
        || ann_lower.contains("in this article, we")
        || ann_lower.contains("in this guide, we'll explore")
        || ann_lower.contains("in this guide, we will explore");
    push_stat(
        &mut patterns,
        "announced_structure",
        "Announced essay structure in opening prose",
        0,
        true,
        ann_trig,
        vec![],
    );

    // restated_thesis_closer (closing paragraph shares >= 50% content words with opening)
    let restated_trig = input.paragraphs.len() >= 3 && {
        let tokenize = |s: &str| -> HashSet<String> {
            s.split(|c: char| !c.is_alphabetic())
                .map(|w| w.to_ascii_lowercase())
                .filter(|w| w.len() >= 5)
                .collect()
        };
        let first = tokenize(&input.paragraphs[0]);
        let last = tokenize(input.paragraphs.last().unwrap());
        !first.is_empty() && !last.is_empty() && {
            let shared = first.intersection(&last).count();
            (shared as f64 / first.len().min(last.len()) as f64) >= 0.5
        }
    };
    push_stat(
        &mut patterns,
        "restated_thesis_closer",
        "Closing paragraph restates opening thesis with >= 50% content-word overlap",
        0,
        true,
        restated_trig,
        vec![],
    );

    // context_leak_copy
    let ctx_leak = ann_lower.contains("never leaves your browser")
        || ann_lower.contains("100% client-side in your browser");
    push_stat(
        &mut patterns,
        "context_leak_copy",
        "Context-inappropriate dev/privacy boilerplate",
        0,
        true,
        ctx_leak,
        vec![],
    );

    // sentence_length_uniformity (dispersion telemetry, weight 0)
    let sent_lengths: Vec<f64> = norm
        .split(['.', '!', '?'])
        .map(count_words)
        .filter(|&w| w >= 4)
        .map(|w| w as f64)
        .collect();
    let uniform_trig = sent_lengths.len() >= 6 && {
        let mean = sent_lengths.iter().sum::<f64>() / sent_lengths.len() as f64;
        let var = sent_lengths
            .iter()
            .map(|x| (x - mean).powi(2))
            .sum::<f64>()
            / sent_lengths.len() as f64;
        let cv = if mean > 0.0 { var.sqrt() / mean } else { 1.0 };
        cv < 0.22
    };
    push_stat(
        &mut patterns,
        "sentence_length_uniformity",
        "Paragraph sentence-length dispersion statistics",
        0,
        true,
        uniform_trig,
        vec![],
    );

    // excess_vocabulary_log_odds (weight 0 review telemetry)
    let excess_trig = bw_cnt >= 6 && per_1000(bw_cnt, prose_word_count) >= 20.0;
    push_stat(
        &mut patterns,
        "excess_vocabulary_log_odds",
        "Corpus-derived Fightin' Words excess vocabulary log-odds score",
        0,
        true,
        excess_trig,
        vec![],
    );

    // Effective weights + C-07 co-occurrence gate
    let all_triggered_count = patterns.iter().filter(|p| p.triggered).count();
    let mut raw_score = 0.0f64;
    for p in &patterns {
        if p.status == "fail" && p.triggered && p.weight > 0 {
            let co_only = matches!(p.id.as_str(), "em_dash_overload" | "rule_of_three");
            if co_only && all_triggered_count <= 1 {
                continue;
            }
            let mult = if p.statistical { weight_mult } else { 1.0 };
            raw_score += (p.weight as f64) * mult;
        }
    }

    let score = (raw_score.round() as u32).min(100);
    let tier = tier_for_copy(score).to_string();
    let triggered_ids: Vec<String> = patterns
        .iter()
        .filter(|p| p.triggered)
        .map(|p| p.id.clone())
        .collect();

    CopyScoreResult {
        axis: "copy".to_string(),
        score,
        tier,
        grade: grade_for_score(score).to_string(),
        word_count,
        prose_word_count,
        lang,
        is_english,
        prose_confidence,
        thin,
        patterns_flagged: triggered_ids.len(),
        patterns_total: patterns.len(),
        triggered_ids,
        patterns,
    }
}
