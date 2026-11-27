//! Design-axis catalogue metadata (45 patterns) and deterministic scoring with POST_PASS_RULES.

use crate::verdict::{grade_for_score, tier_for_design, verdict_for};
use crate::DEFINITIONS_VERSION;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{HashMap, HashSet};

#[derive(Debug, Clone, Copy)]
pub struct DesignPatternMeta {
    pub id: &'static str,
    pub label: &'static str,
    pub weight: u32,
    pub status: &'static str,
    pub category: &'static str,
}

pub const DESIGN_PATTERNS: &[DesignPatternMeta] = &[
    DesignPatternMeta { id: "slop_fonts", label: "Default AI font stack", weight: 8, status: "decaying", category: "typography" },
    DesignPatternMeta { id: "slop_fonts_2026", label: "2026 AI editorial font pairing", weight: 0, status: "review", category: "typography" },
    DesignPatternMeta { id: "purple_accent", label: "Indigo/purple accent palette", weight: 4, status: "decaying", category: "color" },
    DesignPatternMeta { id: "gradient_text", label: "Gradient text headlines", weight: 6, status: "active", category: "color" },
    DesignPatternMeta { id: "gradient_backgrounds", label: "Saturated gradient backgrounds", weight: 4, status: "active", category: "color" },
    DesignPatternMeta { id: "accent_stripe", label: "Top/left card accent stripe", weight: 6, status: "active", category: "layout" },
    DesignPatternMeta { id: "accent_stripe_2026", label: "Accent stripe variant (2026)", weight: 0, status: "review", category: "layout" },
    DesignPatternMeta { id: "glassmorphism", label: "Glassmorphism blur surfaces", weight: 4, status: "active", category: "effects" },
    DesignPatternMeta { id: "colored_glows", label: "Colored neon/glow box-shadows", weight: 4, status: "active", category: "effects" },
    DesignPatternMeta { id: "centered_hero", label: "Centered hero stack", weight: 4, status: "active", category: "layout" },
    DesignPatternMeta { id: "hero_eyebrow_pill", label: "Hero eyebrow badge pill", weight: 5, status: "active", category: "layout" },
    DesignPatternMeta { id: "all_caps_labels", label: "All-caps tracked labels", weight: 0, status: "retired", category: "typography" },
    DesignPatternMeta { id: "eyebrow_label", label: "Repeated section eyebrow labels", weight: 0, status: "review", category: "typography" },
    DesignPatternMeta { id: "perma_dark_mode", label: "Default dark-mode surface", weight: 4, status: "active", category: "color" },
    DesignPatternMeta { id: "icon_card_grid", label: "Uniform icon-card grid", weight: 4, status: "active", category: "layout" },
    DesignPatternMeta { id: "numbered_steps", label: "01/02/03 numbered steps block", weight: 3, status: "active", category: "layout" },
    DesignPatternMeta { id: "stat_banner", label: "KPI stat banner row", weight: 3, status: "active", category: "layout" },
    DesignPatternMeta { id: "faq_accordion", label: "Standard FAQ accordion", weight: 2, status: "active", category: "layout" },
    DesignPatternMeta { id: "gradient_letter_avatars", label: "Gradient monogram avatars", weight: 5, status: "active", category: "effects" },
    DesignPatternMeta { id: "bento_grid", label: "Asymmetric bento grid", weight: 4, status: "active", category: "layout" },
    DesignPatternMeta { id: "aurora_mesh_gradient", label: "Aurora/mesh radial blur blobs", weight: 5, status: "active", category: "effects" },
    DesignPatternMeta { id: "ai_sparkle_badges", label: "AI sparkle icon badges", weight: 3, status: "active", category: "effects" },
    DesignPatternMeta { id: "cream_default_bg", label: "Warm cream editorial default background", weight: 7, status: "active", category: "color" },
    DesignPatternMeta { id: "low_contrast_text", label: "Low-contrast muted body text", weight: 7, status: "active", category: "color" },
    DesignPatternMeta { id: "crushed_tracking", label: "Crushed negative headline tracking", weight: 5, status: "active", category: "typography" },
    DesignPatternMeta { id: "oversized_hero_h1", label: "Oversized hero H1 display scale", weight: 4, status: "active", category: "typography" },
    DesignPatternMeta { id: "nested_cards", label: "Deeply nested bordered cards", weight: 4, status: "active", category: "layout" },
    DesignPatternMeta { id: "flat_type_hierarchy", label: "Flat heading-to-body type hierarchy", weight: 3, status: "active", category: "typography" },
    DesignPatternMeta { id: "scaffold_defaults_unedited", label: "Unedited starter scaffold defaults", weight: 0, status: "review", category: "provenance" },
    DesignPatternMeta { id: "hero_accent_word", label: "Single italic serif accent word in hero", weight: 0, status: "review", category: "typography" },
    DesignPatternMeta { id: "template_chrome_2026", label: "2026 template chrome markers", weight: 0, status: "review", category: "layout" },
    DesignPatternMeta { id: "uniform_radius_shadow", label: "Uniform border-radius and shadow across cards", weight: 0, status: "review", category: "layout" },
    DesignPatternMeta { id: "editorial_cream_kit", label: "Editorial cream starter kit cluster", weight: 0, status: "review", category: "color" },
    DesignPatternMeta { id: "template_page_order", label: "Canonical template section ordering", weight: 0, status: "review", category: "layout" },
    DesignPatternMeta { id: "pulsing_status_badge", label: "Pulsing live status dot badge", weight: 0, status: "review", category: "effects" },
    DesignPatternMeta { id: "display_mono_heading", label: "Monospace display heading", weight: 0, status: "review", category: "typography" },
    DesignPatternMeta { id: "chip_rainbow", label: "Multi-color tag chip rainbow", weight: 0, status: "review", category: "color" },
    DesignPatternMeta { id: "fake_macos_terminal", label: "Fake macOS traffic-light terminal chrome", weight: 0, status: "review", category: "effects" },
    DesignPatternMeta { id: "fake_logo_bar", label: "Placeholder customer logo bar", weight: 0, status: "review", category: "layout" },
    DesignPatternMeta { id: "infinite_marquee_ticker", label: "Infinite marquee ticker", weight: 0, status: "review", category: "motion" },
    DesignPatternMeta { id: "fade_up_monoculture", label: "Uniform fade-up reveal animation", weight: 0, status: "review", category: "motion" },
    DesignPatternMeta { id: "cursor_spotlight_gradient", label: "Cursor-following radial spotlight", weight: 0, status: "review", category: "motion" },
    DesignPatternMeta { id: "uniform_card_hover", label: "Uniform card translateY hover lift", weight: 0, status: "review", category: "motion" },
    DesignPatternMeta { id: "section_template_repetition", label: "Repeated identical section templates", weight: 0, status: "review", category: "layout" },
    DesignPatternMeta { id: "unthemed_browser_surfaces", label: "Unthemed native browser form controls", weight: 0, status: "review", category: "color" },
];

pub fn find_design_pattern(id: &str) -> Option<&'static DesignPatternMeta> {
    DESIGN_PATTERNS.iter().find(|p| p.id == id)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PatternInput {
    pub id: String,
    #[serde(default)]
    pub label: Option<String>,
    #[serde(default)]
    pub weight: Option<u32>,
    #[serde(default)]
    pub triggered: bool,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub rule_status: Option<String>,
    #[serde(default)]
    pub evidence: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScoreAdjustment {
    pub rule_id: String,
    pub target_pattern_id: String,
    pub delta: i32,
    pub reason: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shared_nodes: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pattern_ids: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScoredPattern {
    pub id: String,
    pub label: String,
    pub weight: u32,
    pub status: String,
    pub rule_status: String,
    pub triggered: bool,
    pub score_delta: i32,
    pub last_validated_in: String,
    pub evidence: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesignScoreResult {
    pub score: u32,
    pub tier: String,
    pub grade: String,
    pub verdict: String,
    pub patterns_flagged: usize,
    pub patterns_total: usize,
    pub adjustments: Vec<ScoreAdjustment>,
    pub patterns: Vec<ScoredPattern>,
    pub definitions_version: String,
}

const CRAFT_CHECK_ID_LIST: &[&str] = &[
    "gray_on_color",
    "wide_body_tracking",
    "viewport_meta_missing",
    "zoom_disabled",
    "mobile_reflow_failure",
    "focus_indicator_missing",
    "content_stuck_hidden",
    "dead_cta_controls",
    "reduced_motion_ignored",
    "generic_control_labels",
    "form_no_failure_feedback",
];

/// Deterministic design scorer implementing exact POST_PASS_RULES parity with @slop-detect/core.
pub fn score_patterns(inputs: &[PatternInput]) -> DesignScoreResult {
    let craft_ids: HashSet<&str> = CRAFT_CHECK_ID_LIST.iter().copied().collect();
    let design_inputs: Vec<&PatternInput> = inputs
        .iter()
        .filter(|p| !craft_ids.contains(p.id.as_str()))
        .collect();

    let mut enriched: Vec<ScoredPattern> = Vec::with_capacity(design_inputs.len());
    let mut effective_weights: HashMap<String, i32> = HashMap::new();

    for p in &design_inputs {
        let def = find_design_pattern(&p.id);
        let weight = p.weight.unwrap_or_else(|| def.map(|d| d.weight).unwrap_or(0));
        let caller_overrode = p.weight.is_some_and(|w| w > 0)
            && p.status.as_deref() != Some("review")
            && p.rule_status.as_deref() != Some("review")
            && def.is_some_and(|d| d.status == "review" && weight != d.weight);
        let rule_status = p
            .rule_status
            .clone()
            .or_else(|| {
                if caller_overrode {
                    Some("active".to_string())
                } else {
                    def.map(|d| d.status.to_string())
                }
            })
            .unwrap_or_else(|| "active".to_string());

        let has_error = p.evidence.get("error").is_some_and(|v| !v.is_null())
            || p.status.as_deref() == Some("unknown");
        let is_review = p.status.as_deref() == Some("review")
            || weight == 0
            || matches!(rule_status.as_str(), "review" | "experimental" | "retired");
        let status = if has_error {
            "unknown"
        } else if p.triggered {
            if is_review {
                "review"
            } else {
                "fail"
            }
        } else {
            "pass"
        };

        let eff = if status == "fail" && p.triggered && weight > 0 {
            weight as i32
        } else {
            0
        };
        effective_weights.insert(p.id.clone(), eff);

        enriched.push(ScoredPattern {
            id: p.id.clone(),
            label: p
                .label
                .clone()
                .or_else(|| def.map(|d| d.label.to_string()))
                .unwrap_or_else(|| p.id.clone()),
            weight,
            status: status.to_string(),
            rule_status,
            triggered: p.triggered,
            score_delta: eff,
            last_validated_in: DEFINITIONS_VERSION.to_string(),
            evidence: p.evidence.clone(),
        });
    }

    let mut adjustments: Vec<ScoreAdjustment> = Vec::new();

    // Post-pass 1: slop_fonts_co_signal (D-08)
    if let Some(sf) = enriched.iter().find(|p| p.id == "slop_fonts" && p.triggered) {
        let w_sf = *effective_weights.get("slop_fonts").unwrap_or(&0);
        if w_sf > 0 {
            let ev = &sf.evidence;
            let hero_fam = ev
                .get("resolvedHeroFam")
                .or_else(|| ev.get("heroFam"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_ascii_lowercase()
                .replace(['\'', '"'], "");
            let hero_fam = hero_fam.trim();
            let inter_or_geist_explicit = ev.get("interOrGeistOnly").and_then(|v| v.as_bool());
            let secondary_only = ev.get("secondaryOnly").and_then(|v| v.as_bool());
            let implied = inter_or_geist_explicit.is_none()
                && secondary_only.is_none()
                && !hero_fam.is_empty()
                && (hero_fam.starts_with("inter") || hero_fam.starts_with("geist"));
            let requires_co_signal =
                secondary_only == Some(true) || inter_or_geist_explicit == Some(true) || implied;

            if requires_co_signal {
                let other_scored = enriched.iter().any(|p| {
                    p.id != "slop_fonts"
                        && p.triggered
                        && *effective_weights.get(&p.id).unwrap_or(&0) > 0
                });
                if !other_scored {
                    effective_weights.insert("slop_fonts".to_string(), 0);
                    adjustments.push(ScoreAdjustment {
                        rule_id: "slop_fonts_co_signal".to_string(),
                        target_pattern_id: "slop_fonts".to_string(),
                        delta: -w_sf,
                        reason: "Inter/Geist or secondary slop fonts without any co-occurring design tell contribute 0 points".to_string(),
                        shared_nodes: None,
                        pattern_ids: None,
                    });
                }
            }
        }
    }

    // Post-pass 2: slop_fonts_centered_hero_cap (FIX-07)
    let has_sf = enriched.iter().any(|p| p.id == "slop_fonts" && p.triggered);
    let has_ch = enriched.iter().any(|p| p.id == "centered_hero" && p.triggered);
    if has_sf && has_ch {
        let w_sf = *effective_weights.get("slop_fonts").unwrap_or(&0);
        let w_ch = *effective_weights.get("centered_hero").unwrap_or(&0);
        if w_sf + w_ch > 8 && w_ch > 0 {
            let discount = w_ch.min(w_sf + w_ch - 8);
            effective_weights.insert("centered_hero".to_string(), w_ch - discount);
            adjustments.push(ScoreAdjustment {
                rule_id: "slop_fonts_centered_hero_cap".to_string(),
                target_pattern_id: "centered_hero".to_string(),
                delta: -discount,
                reason: "centered_hero overlaps with slop_fonts on hero typography; combined weight capped at 8".to_string(),
                shared_nodes: None,
                pattern_ids: None,
            });
        }
    }

    // Post-pass 3: purple_accent_co_signal (FIX-06)
    if let Some(pa) = enriched
        .iter()
        .find(|p| p.id == "purple_accent" && p.triggered)
    {
        let has_evidence = pa.evidence.is_object();
        let w_pa = *effective_weights.get("purple_accent").unwrap_or(&0);
        if (has_evidence || enriched.len() > 1) && w_pa > 0 {
            let other_scored = enriched.iter().any(|p| {
                p.id != "purple_accent"
                    && p.triggered
                    && *effective_weights.get(&p.id).unwrap_or(&0) > 0
            });
            if !other_scored {
                effective_weights.insert("purple_accent".to_string(), 0);
                adjustments.push(ScoreAdjustment {
                    rule_id: "purple_accent_co_signal".to_string(),
                    target_pattern_id: "purple_accent".to_string(),
                    delta: -w_pa,
                    reason: "purple_accent alone without co-occurring design signals contributes 0 points".to_string(),
                    shared_nodes: None,
                    pattern_ids: None,
                });
            }
        }
    }

    // Post-pass 4: overlapping_evidence_dedup (FIX-19)
    let with_nodes: Vec<(usize, Vec<String>)> = enriched
        .iter()
        .enumerate()
        .filter_map(|(idx, p)| {
            if !p.triggered {
                return None;
            }
            let arr = p.evidence.get("nodeIds")?.as_array()?;
            let ids: Vec<String> = arr
                .iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect();
            if ids.is_empty() {
                None
            } else {
                Some((idx, ids))
            }
        })
        .collect();

    for i in 0..with_nodes.len() {
        for j in (i + 1)..with_nodes.len() {
            let (idx_a, ref nodes_a) = with_nodes[i];
            let (idx_b, ref nodes_b) = with_nodes[j];
            let set_a: HashSet<&str> = nodes_a.iter().map(|s| s.as_str()).collect();
            let set_b: HashSet<&str> = nodes_b.iter().map(|s| s.as_str()).collect();
            let shared: Vec<String> = nodes_b
                .iter()
                .filter(|n| set_a.contains(n.as_str()))
                .cloned()
                .collect();
            let min_size = set_a.len().min(set_b.len());
            let overlap_ratio = if min_size > 0 {
                shared.len() as f64 / min_size as f64
            } else {
                0.0
            };
            if shared.len() < 2 || overlap_ratio < 0.5 {
                continue;
            }
            let a = &enriched[idx_a];
            let b = &enriched[idx_b];
            let w_a = *effective_weights.get(&a.id).unwrap_or(&0);
            let w_b = *effective_weights.get(&b.id).unwrap_or(&0);
            let target = if w_a >= w_b { b } else { a };
            let target_weight = *effective_weights.get(&target.id).unwrap_or(&0);
            if target_weight > 0 {
                effective_weights.insert(target.id.clone(), 0);
            }
            adjustments.push(ScoreAdjustment {
                rule_id: "overlapping_evidence_dedup".to_string(),
                target_pattern_id: target.id.clone(),
                delta: -target_weight,
                reason: format!(
                    "Overlapping DOM evidence between {} ({}) and {} ({})",
                    a.label, a.id, b.label, b.id
                ),
                shared_nodes: Some(shared),
                pattern_ids: Some(vec![a.id.clone(), b.id.clone()]),
            });
        }
    }

    let mut raw_score: i32 = 0;
    for p in &mut enriched {
        let eff = *effective_weights.get(&p.id).unwrap_or(&0);
        p.score_delta = eff;
        raw_score += eff;
    }

    let clamped = raw_score.clamp(0, 100) as u32;
    let tier = tier_for_design(clamped).to_string();
    let triggered_ids: Vec<String> = enriched
        .iter()
        .filter(|p| p.triggered)
        .map(|p| p.id.clone())
        .collect();
    let verdict = verdict_for(&tier, &triggered_ids).to_string();

    DesignScoreResult {
        score: clamped,
        tier,
        grade: grade_for_score(clamped).to_string(),
        verdict,
        patterns_flagged: triggered_ids.len(),
        patterns_total: enriched.len(),
        adjustments,
        patterns: enriched,
        definitions_version: DEFINITIONS_VERSION.to_string(),
    }
}
