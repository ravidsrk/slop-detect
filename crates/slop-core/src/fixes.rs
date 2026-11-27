//! Deterministic remediation prompts and ≤120-word avoid lists (zero LLM, K-06 compliant).

use crate::design::{find_design_pattern, DESIGN_PATTERNS};
use serde::{Deserialize, Serialize};

pub const AVOID_LIST_WORD_CAP: usize = 120;
pub const FIX_PROMPT_PASSING_LIST_CAP: usize = 8;

pub fn hard_rule_for_pattern(id: &str) -> &'static str {
    match id {
        "slop_fonts" | "slop_fonts_2026" => "Do not default to Inter, Geist, Space Grotesk, or Instrument Serif unless explicitly declared in DESIGN.md.",
        "purple_accent" => "Avoid #6366f1/#8b5cf6 or saturated OKLCH hue 268-310° on primary CTAs unless declared in DESIGN.md.",
        "gradient_text" => "Remove background-clip: text gradient fills on headings; use a solid high-contrast ink token.",
        "gradient_backgrounds" => "Keep opaque gradient surfaces below 15% of viewport area and avoid repeating gradients across sections.",
        "accent_stripe" | "accent_stripe_2026" => "Remove 2-6px decorative colored accent stripes on cards; rely on hierarchy and 1px hairline borders.",
        "glassmorphism" => "Remove backdrop-filter: blur() on translucent cards; use opaque paper or elevated surface tokens.",
        "colored_glows" => "Remove saturated box-shadow blurs >= 24px; keep elevation neutral and restrained.",
        "centered_hero" => "Use an editorial left-aligned or asymmetric hero layout rather than a centered generic sans stack.",
        "hero_eyebrow_pill" => "Remove full-pill (border-radius >= 999px) badge pills above the H1.",
        "perma_dark_mode" => "On dark surfaces, keep body text contrast >= 4.5:1 (avoid mid-grey copy) and declare dark tokens in DESIGN.md.",
        "icon_card_grid" => "Replace uniform 3-up icon-box grids with domain-specific layouts, tables, or concrete product artifacts.",
        "numbered_steps" => "Avoid generic 01/02/03 horizontal step cards unless documenting a literal ordered procedure.",
        "stat_banner" => "Avoid ungrounded 3-4 column giant KPI stat banners without verifiable source labels.",
        "faq_accordion" => "Move answers inline where decisions happen rather than dumping boilerplate Q&A accordions.",
        "gradient_letter_avatars" => "Replace gradient monogram circles with real imagery or clean typographic initials.",
        "bento_grid" => "Replace decorative asymmetric bento boxes with scannable grid rhythm tied to real content density.",
        "aurora_mesh_gradient" => "Remove multi-stop radial blur blobs behind the hero and cards.",
        "ai_sparkle_badges" => "Remove decorative sparkle (✨) icon badges from headings and CTAs.",
        "cream_default_bg" | "editorial_cream_kit" => "Do not pair generic warm-cream backgrounds with default italic-serif accent words unless declared in DESIGN.md.",
        "low_contrast_text" => "Raise body/label contrast to >= 4.5:1 WCAG AA against the effective background.",
        "crushed_tracking" => "Keep heading letter-spacing natural (avoid negative tracking tighter than -0.04em).",
        "oversized_hero_h1" => "Keep hero H1 proportional to viewport and body scale rather than oversized billboard text.",
        "nested_cards" => "Flatten bordered cards nested inside bordered cards; use spacing and typographic grouping.",
        "flat_type_hierarchy" => "Establish a clear heading-to-body size ratio (>= 1.6x for H1/body).",
        "chatbot_markup_leak" => "Strip leaked chatbot citation tokens (oaicite, contentReference, grok-card) immediately.",
        "chatbot_reply_residue" => "Remove pasted chatbot turn framing ('Sure! Here is...', 'Regenerate response').",
        "ai_referral_utm_links" => "Strip utm_source=chatgpt.com / perplexity / claude.ai query parameters from links.",
        "unfilled_placeholders" => "Replace all bracketed placeholders ([Company Name], Lorem ipsum) with real copy.",
        "leaked_markdown" => "Render or remove raw Markdown tokens (**, ##) in visible page copy.",
        "hidden_tag_characters" => "Strip Unicode Tag characters (U+E0000..U+E007F) from source files.",
        _ => "Replace generic template defaults with intentional, domain-specific styling declared in DESIGN.md.",
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FixPromptResult {
    pub mode: String,
    pub triggered_count: usize,
    pub score: Option<u32>,
    pub tier: Option<String>,
    pub text: String,
}

pub fn build_fix_prompt(
    url: Option<&str>,
    score: Option<u32>,
    tier: Option<&str>,
    triggered_ids: &[String],
) -> FixPromptResult {
    let target_label = url.unwrap_or("(not scanned)");
    if triggered_ids.is_empty() {
        let msg = if let Some(s) = score {
            format!(
                "URL: {}\nScore: {}/100 ({}) — nothing to fix. Maintain declared DESIGN.md tokens.",
                target_label,
                s,
                tier.unwrap_or("Clean")
            )
        } else {
            format!(
                "URL: {}\nNo triggered patterns supplied — nothing to fix yet.",
                target_label
            )
        };
        return FixPromptResult {
            mode: "fix".to_string(),
            triggered_count: 0,
            score,
            tier: tier.map(|t| t.to_string()),
            text: msg,
        };
    }

    let mut lines = Vec::new();
    lines.push(format!("URL: {}", target_label));
    match (score, tier) {
        (Some(s), Some(t)) if s < 10 => {
            lines.push(format!(
                "Current score: {}/100 ({}) — already under the Clean threshold. Treat the items below as optional polish.",
                s, t
            ));
            lines.push(String::new());
            lines.push("## Optional polish".to_string());
        }
        (Some(s), Some(t)) => {
            lines.push(format!(
                "Current score: {}/100 ({}). Goal: reduce that score to **< 10 (Clean tier)** by fixing the default-template patterns below without swapping one default for another.",
                s, t
            ));
            lines.push(String::new());
            lines.push("## Findings to fix".to_string());
        }
        _ => {
            lines.push("Built from pattern IDs without a page scan, so there's no score yet.".to_string());
            lines.push(String::new());
            lines.push("## Findings to fix".to_string());
        }
    }

    for id in triggered_ids {
        let meta = find_design_pattern(id);
        let label = meta.map(|m| m.label).unwrap_or(id.as_str());
        let weight = meta.map(|m| m.weight).unwrap_or(0);
        lines.push(format!(
            "- **{}** (`{}`, weight {}): {}",
            label,
            id,
            weight,
            hard_rule_for_pattern(id)
        ));
    }

    let passing: Vec<_> = DESIGN_PATTERNS
        .iter()
        .filter(|p| p.weight > 0 && !triggered_ids.iter().any(|t| t == p.id))
        .take(FIX_PROMPT_PASSING_LIST_CAP)
        .collect();
    let total_passing = DESIGN_PATTERNS
        .iter()
        .filter(|p| p.weight > 0 && !triggered_ids.iter().any(|t| t == p.id))
        .count();

    if !passing.is_empty() {
        lines.push(String::new());
        lines.push("## Currently passing (do not introduce)".to_string());
        for p in &passing {
            lines.push(format!("- **{}** (`{}`)", p.label, p.id));
        }
        if total_passing > passing.len() {
            lines.push(format!(
                "…and {} more currently-passing patterns.",
                total_passing - passing.len()
            ));
        }
    }

    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(format!(
        "Verify locally after editing: `slop-detect scan {} --format agent` (or `npx slop-detect {}` / MCP `--local`).",
        target_label, target_label
    ));

    FixPromptResult {
        mode: "fix".to_string(),
        triggered_count: triggered_ids.len(),
        score,
        tier: tier.map(|t| t.to_string()),
        text: lines.join("\n"),
    }
}

pub fn build_avoid_list(triggered_ids: &[String]) -> FixPromptResult {
    let mut parts = Vec::new();
    if triggered_ids.is_empty() {
        parts.push("Generic avoid list (no page scanned):".to_string());
        for id in [
            "slop_fonts",
            "purple_accent",
            "gradient_text",
            "glassmorphism",
            "colored_glows",
            "hero_eyebrow_pill",
            "bento_grid",
        ] {
            parts.push(format!("- Avoid {}: {}", id, hard_rule_for_pattern(id)));
        }
    } else {
        parts.push("Avoid list (built without a scan):".to_string());
        for id in triggered_ids.iter().take(6) {
            parts.push(format!("- Do not use {}: {}", id, hard_rule_for_pattern(id)));
        }
    }

    // Enforce <= 120 word cap strictly
    let joined = parts.join("\n");
    let words: Vec<&str> = joined.split_whitespace().collect();
    let text = if words.len() <= AVOID_LIST_WORD_CAP {
        joined
    } else {
        words[..AVOID_LIST_WORD_CAP].join(" ")
    };

    FixPromptResult {
        mode: "avoid".to_string(),
        triggered_count: triggered_ids.len(),
        score: None,
        tier: None,
        text,
    }
}
