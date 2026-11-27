//! Craft-floor axis (F-00..F-09): separate 0-100 engineering defect floor (higher is better).
//! HARD RULE (F-00): Never feeds Design, Copy, or Clean/Mild/Heavy tiers.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

#[derive(Debug, Clone, Copy)]
pub struct CraftCheckMeta {
    pub id: &'static str,
    pub label: &'static str,
    pub weight: u32,
    pub category: &'static str,
    pub severity: &'static str,
    pub status: &'static str,
}

pub const CRAFT_CHECKS: &[CraftCheckMeta] = &[
    CraftCheckMeta { id: "gray_on_color", label: "Neutral grey text on a colored background", weight: 10, category: "contrast", severity: "warning", status: "active" },
    CraftCheckMeta { id: "wide_body_tracking", label: "Wide letter-spacing on body text (>0.05em)", weight: 8, category: "typography", severity: "warning", status: "active" },
    CraftCheckMeta { id: "viewport_meta_missing", label: "Missing responsive <meta name=\"viewport\"> with width=device-width", weight: 15, category: "viewport", severity: "warning", status: "active" },
    CraftCheckMeta { id: "zoom_disabled", label: "Pinch-to-zoom disabled via user-scalable=no or maximum-scale < 2", weight: 15, category: "viewport", severity: "warning", status: "active" },
    CraftCheckMeta { id: "mobile_reflow_failure", label: "Horizontal overflow, protrusion, or text box collision (RLF taxonomy)", weight: 20, category: "responsive", severity: "warning", status: "active" },
    CraftCheckMeta { id: "focus_indicator_missing", label: "Interactive elements missing a visible keyboard focus indicator", weight: 12, category: "interaction", severity: "warning", status: "active" },
    CraftCheckMeta { id: "content_stuck_hidden", label: "Page content stuck at opacity 0 or visibility:hidden after load/scroll", weight: 10, category: "motion", severity: "warning", status: "active" },
    CraftCheckMeta { id: "dead_cta_controls", label: "Primary or repeated CTA controls produce no navigation or state change", weight: 10, category: "interaction", severity: "warning", status: "active" },
    CraftCheckMeta { id: "reduced_motion_ignored", label: "Continuous decorative animations remain active under prefers-reduced-motion: reduce", weight: 0, category: "motion", severity: "info", status: "review" },
    CraftCheckMeta { id: "generic_control_labels", label: "Ambiguous generic link/button accessible names (\"learn more\", \"click here\") or filename alt text", weight: 10, category: "a11y", severity: "warning", status: "active" },
    CraftCheckMeta { id: "form_no_failure_feedback", label: "Form submits empty with no invalid state or visible error feedback", weight: 10, category: "interaction", severity: "warning", status: "active" },
];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CraftCheckResult {
    pub id: String,
    pub label: String,
    pub weight: u32,
    pub category: String,
    pub status: String,
    pub triggered: bool,
    pub score_delta: i32,
    pub evidence: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CraftScoreResult {
    pub axis: String,
    pub score: Option<u32>,
    pub max_score: u32,
    pub earned_weight: u32,
    pub applicable_weight: u32,
    pub coverage: f64,
    pub checks: Vec<CraftCheckResult>,
    pub failed_ids: Vec<String>,
}

pub fn score_craft(raw_results: &HashMap<String, Value>) -> CraftScoreResult {
    let mut earned_weight = 0u32;
    let mut applicable_weight = 0u32;
    let mut measured_count = 0u32;
    let mut applicable_count = 0u32;
    let mut checks = Vec::with_capacity(CRAFT_CHECKS.len());
    let mut failed_ids = Vec::new();

    for meta in CRAFT_CHECKS {
        let raw = raw_results
            .get(meta.id)
            .cloned()
            .unwrap_or_else(|| Value::Object(serde_json::Map::new()));
        let raw_status = raw.get("status").and_then(|v| v.as_str()).unwrap_or("");
        let is_unknown = raw_status == "unknown" || raw.get("error").is_some_and(|v| !v.is_null());
        let is_na = raw_status == "na";
        let is_info = raw_status == "review"
            || meta.weight == 0
            || meta.severity == "info"
            || meta.status == "review";
        let triggered = raw
            .get("triggered")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        let status = if is_unknown {
            "unknown"
        } else if is_na {
            "na"
        } else if triggered && is_info {
            "review"
        } else if triggered {
            "fail"
        } else {
            "pass"
        };

        if !is_na && !is_info {
            applicable_count += 1;
            if !is_unknown {
                measured_count += 1;
                applicable_weight += meta.weight;
                if !triggered {
                    earned_weight += meta.weight;
                }
            }
        }

        if status == "fail" {
            failed_ids.push(meta.id.to_string());
        }

        checks.push(CraftCheckResult {
            id: meta.id.to_string(),
            label: meta.label.to_string(),
            weight: meta.weight,
            category: meta.category.to_string(),
            status: status.to_string(),
            triggered,
            score_delta: if status == "fail" {
                -(meta.weight as i32)
            } else {
                0
            },
            evidence: raw,
        });
    }

    let score = if applicable_weight > 0 {
        Some(((earned_weight as f64 / applicable_weight as f64) * 100.0).round().clamp(0.0, 100.0) as u32)
    } else {
        None
    };
    let coverage = if applicable_count > 0 {
        ((measured_count as f64 / applicable_count as f64) * 100.0).round() / 100.0
    } else {
        1.0
    };

    CraftScoreResult {
        axis: "craft".to_string(),
        score,
        max_score: 100,
        earned_weight,
        applicable_weight,
        coverage,
        checks,
        failed_ids,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReflowRect {
    pub left: f64,
    pub top: f64,
    pub right: f64,
    pub bottom: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReflowElement {
    #[serde(default)]
    pub tag: Option<String>,
    #[serde(default)]
    pub text: Option<String>,
    pub rect: ReflowRect,
    #[serde(default)]
    pub opacity: Option<f64>,
    #[serde(default)]
    pub has_border: Option<bool>,
    #[serde(default)]
    pub in_scrollable_x: Option<bool>,
    #[serde(default)]
    pub in_marquee: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MobileReflowEval {
    pub triggered: bool,
    pub subtypes: Vec<String>,
    pub page_overflow_px: i64,
    pub viewport_protrusions: Vec<String>,
}

pub fn evaluate_mobile_reflow(
    viewport_width: f64,
    scroll_width: f64,
    elements: &[ReflowElement],
) -> MobileReflowEval {
    let mut viewport_protrusions = Vec::new();
    for el in elements {
        if el.in_scrollable_x == Some(true) || el.in_marquee == Some(true) {
            continue;
        }
        if el.opacity.is_some_and(|o| o <= 0.01) {
            continue;
        }
        if el.rect.right > viewport_width + 8.0 {
            let label = el
                .text
                .as_deref()
                .filter(|s| !s.trim().is_empty())
                .or(el.tag.as_deref())
                .unwrap_or("element");
            viewport_protrusions.push(label.chars().take(40).collect());
        }
    }
    let page_overflow_px = (scroll_width - viewport_width).round().max(0.0) as i64;
    let page_overflow = page_overflow_px > 8 && (elements.is_empty() || !viewport_protrusions.is_empty());

    let mut subtypes = Vec::new();
    if page_overflow {
        subtypes.push("page_overflow".to_string());
    }
    if !viewport_protrusions.is_empty() {
        subtypes.push("viewport_protrusion".to_string());
    }

    MobileReflowEval {
        triggered: !subtypes.is_empty(),
        subtypes,
        page_overflow_px,
        viewport_protrusions: viewport_protrusions.into_iter().take(5).collect(),
    }
}
