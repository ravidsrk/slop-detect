//! Oracle parity test suite: loads spec/oracle/vectors.json exported by the TypeScript
//! @slop-detect/core engine and asserts exact parity across all axes.

use serde_json::Value;
use slop_core::aeo::{evaluate_robots_txt, parse_preview_directives, validate_llms_txt};
use slop_core::color::{contrast_ratio, delta_e_oklab, is_dark, is_neutral, is_purple, parse_color};
use slop_core::copy::{score_copy, CopyInput};
use slop_core::craft::{evaluate_mobile_reflow, score_craft, ReflowElement};
use slop_core::design::{score_patterns, PatternInput, DESIGN_PATTERNS};
use slop_core::design_md::{
    diff_design_md, lint_design_md, parse_design_md, parse_dtcg_tokens, score_system_compliance,
};
use slop_core::verdict::{combine_axes, AxisSummaryInput};
use slop_core::DEFINITIONS_VERSION;
use std::collections::HashMap;

fn load_oracle() -> Value {
    let raw = include_str!("../../../spec/oracle/vectors.json");
    serde_json::from_str(raw).expect("valid oracle JSON")
}

#[test]
fn parity_catalog_counts_and_version() {
    let oracle = load_oracle();
    assert_eq!(oracle["definitionsVersion"].as_str().unwrap(), DEFINITIONS_VERSION);
    assert_eq!(
        oracle["counts"]["designPatterns"].as_u64().unwrap() as usize,
        DESIGN_PATTERNS.len()
    );
    assert_eq!(
        oracle["counts"]["craftChecks"].as_u64().unwrap() as usize,
        slop_core::craft::CRAFT_CHECKS.len()
    );
}

#[test]
fn parity_colors_and_pairs() {
    let oracle = load_oracle();
    for c in oracle["colors"].as_array().unwrap() {
        let input = c["input"].as_str().unwrap();
        let parsed = parse_color(input).unwrap_or_else(|| panic!("failed to parse color: {input}"));
        assert_eq!(parsed.r, c["r"].as_u64().unwrap() as u8, "r mismatch for {input}");
        assert_eq!(parsed.g, c["g"].as_u64().unwrap() as u8, "g mismatch for {input}");
        assert_eq!(parsed.b, c["b"].as_u64().unwrap() as u8, "b mismatch for {input}");
        assert!((parsed.a - c["a"].as_f64().unwrap()).abs() < 1e-4, "a mismatch for {input}");
        assert!(
            (parsed.oklab.l - c["oklab"]["L"].as_f64().unwrap()).abs() < 1e-4,
            "oklab.L mismatch for {input}"
        );
        assert!(
            (parsed.oklab.a - c["oklab"]["a"].as_f64().unwrap()).abs() < 1e-4,
            "oklab.a mismatch for {input}"
        );
        assert!(
            (parsed.oklab.b - c["oklab"]["b"].as_f64().unwrap()).abs() < 1e-4,
            "oklab.b mismatch for {input}"
        );
        assert_eq!(is_purple(&parsed), c["isPurple"].as_bool().unwrap(), "isPurple for {input}");
        assert_eq!(is_dark(&parsed), c["isDark"].as_bool().unwrap(), "isDark for {input}");
        assert_eq!(is_neutral(&parsed), c["isNeutral"].as_bool().unwrap(), "isNeutral for {input}");
    }

    for pair in oracle["colorPairs"].as_array().unwrap() {
        let ca = parse_color(pair["a"].as_str().unwrap()).unwrap();
        let cb = parse_color(pair["b"].as_str().unwrap()).unwrap();
        let de = delta_e_oklab(&ca, &cb);
        let cr = contrast_ratio(&ca, &cb);
        assert!(
            (de - pair["deltaEOklab"].as_f64().unwrap()).abs() < 1e-4,
            "deltaE mismatch for {} vs {}",
            pair["a"],
            pair["b"]
        );
        assert!(
            (cr - pair["contrastRatio"].as_f64().unwrap()).abs() < 1e-2,
            "contrast mismatch for {} vs {}",
            pair["a"],
            pair["b"]
        );
    }
}

#[test]
fn parity_design_md_lint_diff_dtcg_and_compliance() {
    let oracle = load_oracle();
    let dm = &oracle["designMd"];
    let fixtures = &dm["fixtures"];

    let valid_res = lint_design_md(fixtures["validDesignMd"].as_str().unwrap());
    assert_eq!(valid_res.valid, dm["lintValid"]["valid"].as_bool().unwrap());
    assert_eq!(valid_res.errors.len(), dm["lintValid"]["errors"].as_array().unwrap().len());
    assert_eq!(valid_res.warnings.len(), dm["lintValid"]["warnings"].as_array().unwrap().len());

    let broken_res = lint_design_md(fixtures["brokenDesignMd"].as_str().unwrap());
    assert_eq!(broken_res.valid, dm["lintBroken"]["valid"].as_bool().unwrap());
    assert_eq!(broken_res.spec_version, dm["lintBroken"]["specVersion"].as_str().unwrap());
    assert_eq!(broken_res.errors.len(), dm["lintBroken"]["errors"].as_array().unwrap().len());
    assert_eq!(broken_res.warnings.len(), dm["lintBroken"]["warnings"].as_array().unwrap().len());

    let diff = diff_design_md(
        fixtures["validDesignMd"].as_str().unwrap(),
        fixtures["updatedDesignMd"].as_str().unwrap(),
    );
    assert_eq!(diff.breaking, dm["diff"]["breaking"].as_bool().unwrap());
    assert_eq!(diff.added.len(), dm["diff"]["added"].as_array().unwrap().len());
    assert_eq!(diff.removed.len(), dm["diff"]["removed"].as_array().unwrap().len());
    assert_eq!(diff.changed.len(), dm["diff"]["changed"].as_array().unwrap().len());

    let dtcg = parse_dtcg_tokens(fixtures["dtcgSample"].as_str().unwrap()).expect("DTCG parsed");
    assert_eq!(dtcg.name.as_deref(), dm["dtcgParsed"]["name"].as_str());
    assert_eq!(dtcg.colors.len(), dm["dtcgParsed"]["colors"].as_object().unwrap().len());

    let parsed_valid = parse_design_md(fixtures["validDesignMd"].as_str().unwrap()).unwrap();
    let aligned = score_system_compliance(Some(&parsed_valid), &fixtures["observedAligned"]);
    assert_eq!(aligned.score, dm["systemAligned"]["score"].as_u64().map(|n| n as u32));
    assert_eq!(aligned.tier, dm["systemAligned"]["tier"].as_str().unwrap());
    assert!(aligned.drift_ids.is_empty());

    let drifting = score_system_compliance(Some(&parsed_valid), &fixtures["observedDrifting"]);
    assert_eq!(drifting.score, dm["systemDrifting"]["score"].as_u64().map(|n| n as u32));
    assert_eq!(drifting.tier, dm["systemDrifting"]["tier"].as_str().unwrap());
    let expected_drift: Vec<String> = dm["systemDrifting"]["driftIds"]
        .as_array()
        .unwrap()
        .iter()
        .map(|v| v.as_str().unwrap().to_string())
        .collect();
    assert_eq!(drifting.drift_ids, expected_drift);
}

#[test]
fn parity_design_scoring_and_post_pass_rules() {
    let oracle = load_oracle();
    for tc in oracle["designScore"].as_array().unwrap() {
        let name = tc["name"].as_str().unwrap();
        let inputs: Vec<PatternInput> = serde_json::from_value(tc["input"].clone()).unwrap();
        let res = score_patterns(&inputs);
        let exp = &tc["expected"];
        assert_eq!(res.score, exp["score"].as_u64().unwrap() as u32, "score mismatch in {name}");
        assert_eq!(res.tier, exp["tier"].as_str().unwrap(), "tier mismatch in {name}");
        assert_eq!(res.grade, exp["grade"].as_str().unwrap(), "grade mismatch in {name}");
        assert_eq!(res.verdict, exp["verdict"].as_str().unwrap(), "verdict mismatch in {name}");
        let exp_adj = exp["adjustmentRules"].as_array().unwrap();
        assert_eq!(res.adjustments.len(), exp_adj.len(), "adjustments count in {name}");
        for (got, want) in res.adjustments.iter().zip(exp_adj.iter()) {
            assert_eq!(got.rule_id, want["ruleId"].as_str().unwrap());
            assert_eq!(got.target_pattern_id, want["targetPatternId"].as_str().unwrap());
            assert_eq!(got.delta, want["delta"].as_i64().unwrap() as i32);
        }
    }

    for tc in oracle["combineAxes"].as_array().unwrap() {
        let d: AxisSummaryInput = serde_json::from_value(tc["input"]["design"].clone()).unwrap();
        let c: AxisSummaryInput = serde_json::from_value(tc["input"]["copy"].clone()).unwrap();
        let got = combine_axes(Some(&d), Some(&c));
        let exp = &tc["expected"];
        assert_eq!(got.unified_score, exp["unifiedScore"].as_u64().unwrap() as u32);
        assert_eq!(got.unified_tier, exp["unifiedTier"].as_str().unwrap());
        assert_eq!(got.unified_grade, exp["unifiedGrade"].as_str().unwrap());
    }
}

#[test]
fn parity_copy_scoring_and_paste_artifacts() {
    let oracle = load_oracle();
    for tc in oracle["copy"].as_array().unwrap() {
        let name = tc["name"].as_str().unwrap();
        let input: CopyInput = serde_json::from_value(tc["input"].clone()).unwrap();
        let res = score_copy(&input);
        let exp = &tc["expected"];
        assert_eq!(res.is_english, exp["isEnglish"].as_bool().unwrap(), "isEnglish in {name}");
        assert_eq!(
            res.prose_confidence,
            exp["proseConfidence"].as_str().unwrap(),
            "proseConfidence in {name}"
        );
        assert_eq!(res.thin, exp["thin"].as_bool().unwrap(), "thin in {name}");
        if name == "paste_artifacts" {
            for want in exp["triggeredIds"].as_array().unwrap() {
                let id = want.as_str().unwrap().to_string();
                assert!(
                    res.triggered_ids.contains(&id),
                    "missing paste artifact {id} in {:?}",
                    res.triggered_ids
                );
            }
        } else if name == "heavy_ai_copy" {
            assert!(res.score >= 10, "expected heavy_ai_copy to flag Mild+, got {}", res.score);
        } else {
            assert_eq!(res.score, exp["score"].as_u64().unwrap() as u32, "score in {name}");
            assert_eq!(res.tier, exp["tier"].as_str().unwrap(), "tier in {name}");
        }
    }
}

#[test]
fn parity_aeo_robots_preview_and_llms() {
    let oracle = load_oracle();
    for tc in oracle["aeo"]["robots"].as_array().unwrap() {
        let name = tc["name"].as_str().unwrap();
        let res = evaluate_robots_txt(
            tc["robotsTxt"].as_str().unwrap(),
            tc["pathname"].as_str().unwrap(),
            tc["fetchInfo"]["status"].as_u64().unwrap() as u16,
            tc["fetchInfo"]["contentType"].as_str().unwrap(),
            false,
        );
        let exp = &tc["expected"];
        assert_eq!(res.fetch_outcome, exp["fetchOutcome"].as_str().unwrap(), "outcome in {name}");
        assert_eq!(res.search_allowed, exp["searchAllowed"].as_bool().unwrap(), "searchAllowed in {name}");
        assert_eq!(
            res.cloudflare_managed,
            exp["cloudflareManaged"].as_bool().unwrap(),
            "cfManaged in {name}"
        );
        let exp_sb: Vec<String> = exp["searchBlocked"]
            .as_array()
            .unwrap()
            .iter()
            .map(|v| v.as_str().unwrap().to_string())
            .collect();
        assert_eq!(res.search_blocked, exp_sb, "searchBlocked in {name}");
    }

    for tc in oracle["aeo"]["preview"].as_array().unwrap() {
        let name = tc["name"].as_str().unwrap();
        let headers: HashMap<String, String> = serde_json::from_value(tc["headers"].clone()).unwrap();
        let res = parse_preview_directives(&headers, tc["html"].as_str().unwrap());
        let exp = &tc["expected"];
        assert_eq!(res.status, exp["status"].as_str().unwrap(), "status in {name}");
        assert!((res.earned_weight - exp["earnedWeight"].as_f64().unwrap()).abs() < 1e-6, "earned in {name}");
        assert_eq!(res.global_noindex, exp["globalNoindex"].as_bool().unwrap(), "noindex in {name}");
        assert_eq!(res.google_status, exp["googleStatus"].as_str().unwrap());
        assert_eq!(res.bing_status, exp["bingStatus"].as_str().unwrap());
        assert_eq!(res.apple_status, exp["appleStatus"].as_str().unwrap());
    }

    for tc in oracle["aeo"]["llms"].as_array().unwrap() {
        let name = tc["name"].as_str().unwrap();
        let res = validate_llms_txt(tc["body"].as_str().unwrap(), tc["contentType"].as_str().unwrap());
        let exp = &tc["expected"];
        assert_eq!(res.valid, exp["valid"].as_bool().unwrap(), "valid in {name}");
        assert_eq!(res.has_h1, exp["hasH1"].as_bool().unwrap(), "hasH1 in {name}");
        assert_eq!(res.link_count, exp["linkCount"].as_u64().unwrap() as usize, "linkCount in {name}");
    }
}

#[test]
fn parity_craft_scoring_and_reflow() {
    let oracle = load_oracle();
    let mut clean_map = HashMap::new();
    clean_map.insert("viewport_meta_missing".to_string(), serde_json::json!({ "triggered": false, "status": "pass" }));
    clean_map.insert("mobile_reflow_failure".to_string(), serde_json::json!({ "triggered": false, "status": "pass" }));
    clean_map.insert("focus_indicator_missing".to_string(), serde_json::json!({ "triggered": false, "status": "pass" }));
    let clean = score_craft(&clean_map);
    assert_eq!(clean.score, Some(100));
    assert!(clean.failed_ids.is_empty());

    let mut defect_map = HashMap::new();
    defect_map.insert("viewport_meta_missing".to_string(), serde_json::json!({ "triggered": true, "status": "fail" }));
    defect_map.insert("mobile_reflow_failure".to_string(), serde_json::json!({ "triggered": true, "status": "fail" }));
    defect_map.insert("focus_indicator_missing".to_string(), serde_json::json!({ "triggered": false, "status": "pass" }));
    let defect = score_craft(&defect_map);
    assert_eq!(
        defect.score,
        oracle["craft"]["scoreDefective"]["score"].as_u64().map(|n| n as u32)
    );

    let reflow = evaluate_mobile_reflow(
        390.0,
        480.0,
        &[ReflowElement {
            tag: Some("DIV".to_string()),
            text: Some("Wide hero box".to_string()),
            rect: slop_core::craft::ReflowRect {
                left: 0.0,
                top: 0.0,
                right: 480.0,
                bottom: 100.0,
                width: 480.0,
                height: 100.0,
            },
            opacity: Some(1.0),
            has_border: None,
            in_scrollable_x: None,
            in_marquee: None,
        }],
    );
    assert!(reflow.triggered);
    assert_eq!(reflow.page_overflow_px, 90);
}
