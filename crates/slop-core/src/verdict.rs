//! Letter grades, tiers, deterministic FNV-1a verdict selection, and multi-axis combination.

use serde::{Deserialize, Serialize};

pub fn tier_for_design(score: u32) -> &'static str {
    if score >= 28 {
        "Heavy"
    } else if score >= 10 {
        "Mild"
    } else {
        "Clean"
    }
}

pub fn tier_for_copy(score: u32) -> &'static str {
    if score >= 20 {
        "Heavy"
    } else if score >= 8 {
        "Mild"
    } else {
        "Clean"
    }
}

pub fn grade_for_score(score: u32) -> &'static str {
    let s = score.min(100);
    match s {
        0..=2 => "A+",
        3..=5 => "A",
        6..=9 => "A-",
        10..=14 => "B+",
        15..=19 => "B",
        20..=23 => "B-",
        24..=27 => "C",
        28..=33 => "D+",
        34..=39 => "D",
        _ => "F",
    }
}

const CLEAN_VERDICTS: [&str; 4] = [
    "Matches few default-template patterns. Distinct visual choices.",
    "Clean. Minimal overlap with common default-template patterns.",
    "Few default-template patterns matched — custom layout and palette.",
    "Restrained palette and typography. Default-template patterns are absent.",
];

const MILD_VERDICTS: [&str; 4] = [
    "Mostly clean, with a few default-template patterns present.",
    "Matches a few default-template patterns; most layout choices are distinct.",
    "A handful of default-template patterns away from clean.",
    "Moderate overlap with default-template patterns across a few styling rules.",
];

const HEAVY_VERDICTS: [&str; 4] = [
    "Heavy slop. High overlap with common default-template patterns.",
    "Matches many default-template patterns — gradients, default fonts, and repeated card grids.",
    "Dense concentration of default-template patterns.",
    "High match count of default-template patterns across typography, color, and layout.",
];

/// Matches JS `Math.imul(h ^ s.charCodeAt(i), 16777619)` + `Math.abs(h) % arr.length` exactly.
fn pick_verdict<'a>(pool: &'a [&'a str], seed: &str) -> &'a str {
    let mut h: i32 = 2166136261u32 as i32;
    for unit in seed.encode_utf16() {
        h ^= unit as i32;
        h = h.wrapping_mul(16777619i32);
    }
    let idx = (h.unsigned_abs() as usize) % pool.len();
    pool[idx]
}

pub fn verdict_for(tier: &str, triggered_ids: &[String]) -> &'static str {
    let pool = match tier {
        "Clean" => &CLEAN_VERDICTS,
        "Heavy" => &HEAVY_VERDICTS,
        _ => &MILD_VERDICTS,
    };
    let mut sorted = triggered_ids.to_vec();
    sorted.sort();
    let seed = format!("{}:{}", tier, sorted.join(","));
    pick_verdict(pool, &seed)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AxisSummaryInput {
    pub score: u32,
    pub tier: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CombinedAxesResult {
    pub unified_score: u32,
    pub unified_tier: String,
    pub unified_grade: String,
    pub axes_scored: Vec<String>,
    pub dirty_axes: usize,
}

/// Combine design and copy axes into unifiedScore/unifiedTier.
/// Craft, AEO, and System axes NEVER feed unifiedScore (F-00 hard rule).
pub fn combine_axes(
    design: Option<&AxisSummaryInput>,
    copy: Option<&AxisSummaryInput>,
) -> CombinedAxesResult {
    let mut axes_scored = Vec::new();
    let mut scores = Vec::new();
    let mut dirty_axes = 0usize;

    if let Some(d) = design {
        axes_scored.push("design".to_string());
        scores.push(d.score);
        if d.tier != "Clean" {
            dirty_axes += 1;
        }
    }
    if let Some(c) = copy {
        axes_scored.push("copy".to_string());
        scores.push(c.score);
        if c.tier != "Clean" {
            dirty_axes += 1;
        }
    }

    if scores.is_empty() {
        return CombinedAxesResult {
            unified_score: 0,
            unified_tier: "Clean".to_string(),
            unified_grade: grade_for_score(0).to_string(),
            axes_scored,
            dirty_axes: 0,
        };
    }

    let max_score = scores.into_iter().max().unwrap_or(0);
    let penalty = (dirty_axes.saturating_sub(1) as u32) * 6;
    let unified = (max_score + penalty).min(100);
    let unified_tier = tier_for_design(unified).to_string();

    CombinedAxesResult {
        unified_score: unified,
        unified_tier,
        unified_grade: grade_for_score(unified).to_string(),
        axes_scored,
        dirty_axes,
    }
}
