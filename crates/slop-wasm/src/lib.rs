//! Zero-dependency-glue WebAssembly (`wasm32-unknown-unknown`) exports for `slop-core`.
//!
//! Any JS/Cloudflare Workers/Browser/Wasmtime host can load `slop_wasm.wasm` with
//! `WebAssembly.instantiate()` using the linear-memory JSON-in / JSON-out ABI below,
//! or invoke the Rust functions directly when linked as an `rlib`.

use serde_json::{json, Value};
use slop_core::aeo::{evaluate_robots_txt, parse_preview_directives, validate_llms_txt};
use slop_core::color::parse_color;
use slop_core::copy::{score_copy, CopyInput};
use slop_core::design::{score_patterns, PatternInput};
use slop_core::design_md::{
    diff_design_md, extract_dtcg_tokens, generate_design_md, lint_design_md, parse_design_md,
    score_system_compliance,
};
use slop_core::fixes::{build_avoid_list, build_fix_prompt};
use slop_core::{DEFINITIONS_VERSION, ENGINE_VERSION};
use std::collections::HashMap;

pub fn lint_design_md_json(input: &str) -> String {
    serde_json::to_string(&lint_design_md(input)).unwrap_or_else(|_| "{}".to_string())
}

pub fn diff_design_md_json(base: &str, head: &str) -> String {
    serde_json::to_string(&diff_design_md(base, head)).unwrap_or_else(|_| "{}".to_string())
}

pub fn score_patterns_json(input_json: &str) -> String {
    match serde_json::from_str::<Vec<PatternInput>>(input_json) {
        Ok(patterns) => serde_json::to_string(&score_patterns(&patterns))
            .unwrap_or_else(|_| "{}".to_string()),
        Err(e) => json!({ "error": e.to_string() }).to_string(),
    }
}

pub fn score_copy_json(input_json: &str) -> String {
    match serde_json::from_str::<CopyInput>(input_json) {
        Ok(input) => serde_json::to_string(&score_copy(&input))
            .unwrap_or_else(|_| "{}".to_string()),
        Err(e) => json!({ "error": e.to_string() }).to_string(),
    }
}

pub fn score_system_json(input_json: &str) -> String {
    match serde_json::from_str::<Value>(input_json) {
        Ok(val) => {
            let md = val.get("designMd").and_then(|v| v.as_str()).unwrap_or("");
            let obs = val.get("observed").cloned().unwrap_or(Value::Null);
            let parsed = parse_design_md(md);
            serde_json::to_string(&score_system_compliance(parsed.as_ref(), &obs))
                .unwrap_or_else(|_| "{}".to_string())
        }
        Err(e) => json!({ "error": e.to_string() }).to_string(),
    }
}

pub fn parse_color_json(input: &str) -> String {
    match parse_color(input) {
        Some(c) => serde_json::to_string(&c).unwrap_or_else(|_| "null".to_string()),
        None => "null".to_string(),
    }
}

pub fn evaluate_robots_json(input_json: &str) -> String {
    match serde_json::from_str::<Value>(input_json) {
        Ok(v) => {
            let res = evaluate_robots_txt(
                v.get("robotsTxt").and_then(|x| x.as_str()).unwrap_or(""),
                v.get("pathname").and_then(|x| x.as_str()).unwrap_or("/"),
                v.get("status").and_then(|x| x.as_u64()).unwrap_or(200) as u16,
                v.get("contentType")
                    .and_then(|x| x.as_str())
                    .unwrap_or("text/plain"),
                false,
            );
            serde_json::to_string(&res).unwrap_or_else(|_| "{}".to_string())
        }
        Err(e) => json!({ "error": e.to_string() }).to_string(),
    }
}

pub fn dispatch_json(op: &str, payload: &str) -> String {
    match op {
        "version" => json!({
            "engineVersion": ENGINE_VERSION,
            "definitionsVersion": DEFINITIONS_VERSION,
        })
        .to_string(),
        "lint_design_md" => lint_design_md_json(payload),
        "diff_design_md" => match serde_json::from_str::<Value>(payload) {
            Ok(v) => diff_design_md_json(
                v.get("base").and_then(|x| x.as_str()).unwrap_or(""),
                v.get("head").and_then(|x| x.as_str()).unwrap_or(""),
            ),
            Err(e) => json!({ "error": e.to_string() }).to_string(),
        },
        "score_patterns" => score_patterns_json(payload),
        "score_copy" => score_copy_json(payload),
        "score_system" => score_system_json(payload),
        "parse_color" => parse_color_json(payload),
        "evaluate_robots" => evaluate_robots_json(payload),
        "parse_preview" => match serde_json::from_str::<Value>(payload) {
            Ok(v) => {
                let headers: HashMap<String, String> = v
                    .get("headers")
                    .and_then(|x| serde_json::from_value(x.clone()).ok())
                    .unwrap_or_default();
                let html = v.get("html").and_then(|x| x.as_str()).unwrap_or("");
                serde_json::to_string(&parse_preview_directives(&headers, html))
                    .unwrap_or_else(|_| "{}".to_string())
            }
            Err(e) => json!({ "error": e.to_string() }).to_string(),
        },
        "validate_llms" => match serde_json::from_str::<Value>(payload) {
            Ok(v) => {
                let res = validate_llms_txt(
                    v.get("body").and_then(|x| x.as_str()).unwrap_or(""),
                    v.get("contentType")
                        .and_then(|x| x.as_str())
                        .unwrap_or("text/plain"),
                );
                serde_json::to_string(&res).unwrap_or_else(|_| "{}".to_string())
            }
            Err(e) => json!({ "error": e.to_string() }).to_string(),
        },
        "fix_prompt" => match serde_json::from_str::<Value>(payload) {
            Ok(v) => {
                let url = v.get("url").and_then(|x| x.as_str());
                let score = v.get("score").and_then(|x| x.as_u64()).map(|n| n as u32);
                let tier = v.get("tier").and_then(|x| x.as_str());
                let brief = v.get("brief").and_then(|x| x.as_bool()).unwrap_or(false);
                let patterns: Vec<String> = v
                    .get("patterns")
                    .and_then(|x| x.as_array())
                    .map(|a| {
                        a.iter()
                            .filter_map(|i| i.as_str().map(|s| s.to_string()))
                            .collect()
                    })
                    .unwrap_or_default();
                let res = if brief {
                    build_avoid_list(&patterns)
                } else {
                    build_fix_prompt(url, score, tier, &patterns)
                };
                serde_json::to_string(&res).unwrap_or_else(|_| "{}".to_string())
            }
            Err(e) => json!({ "error": e.to_string() }).to_string(),
        },
        "extract_design_system" => match serde_json::from_str::<Value>(payload) {
            Ok(v) => {
                let obs = v.get("observed").cloned().unwrap_or(Value::Null);
                let name = v.get("name").and_then(|x| x.as_str());
                let url = v.get("url").and_then(|x| x.as_str());
                let design_md = generate_design_md(&obs, name, url);
                let dtcg = extract_dtcg_tokens(&obs, name);
                json!({ "designMd": design_md, "dtcg": dtcg }).to_string()
            }
            Err(e) => json!({ "error": e.to_string() }).to_string(),
        },
        _ => json!({ "error": format!("unknown op: {}", op) }).to_string(),
    }
}

// ── Minimal C/WASM linear-memory ABI (zero wasm-bindgen dependency required!) ──

#[no_mangle]
pub extern "C" fn slop_alloc(len: usize) -> *mut u8 {
    if len == 0 {
        return std::ptr::null_mut();
    }
    let Ok(layout) = std::alloc::Layout::from_size_align(len, 1) else {
        return std::ptr::null_mut();
    };
    unsafe { std::alloc::alloc(layout) }
}

/// Deallocate a buffer previously allocated by [`slop_alloc`].
///
/// # Safety
/// `ptr` must be null or a pointer returned by [`slop_alloc`] with the exact same `len`.
#[no_mangle]
pub unsafe extern "C" fn slop_dealloc(ptr: *mut u8, len: usize) {
    if !ptr.is_null() && len > 0 {
        if let Ok(layout) = std::alloc::Layout::from_size_align(len, 1) {
            std::alloc::dealloc(ptr, layout);
        }
    }
}

/// Call any core op from a WASM host.
/// Returns a packed u64: high 32 bits = result ptr, low 32 bits = result len.
///
/// # Safety
/// `op_ptr`/`op_len` and `payload_ptr`/`payload_len` must point to valid readable
/// memory slices (or be null when their respective length is 0).
#[no_mangle]
pub unsafe extern "C" fn slop_call(
    op_ptr: *const u8,
    op_len: usize,
    payload_ptr: *const u8,
    payload_len: usize,
) -> u64 {
    let op = if op_ptr.is_null() || op_len == 0 {
        ""
    } else {
        std::str::from_utf8(std::slice::from_raw_parts(op_ptr, op_len)).unwrap_or("")
    };
    let payload = if payload_ptr.is_null() || payload_len == 0 {
        ""
    } else {
        std::str::from_utf8(std::slice::from_raw_parts(payload_ptr, payload_len)).unwrap_or("")
    };
    let out = dispatch_json(op, payload).into_bytes();
    let out_len = out.len();
    let out_ptr = slop_alloc(out_len);
    if !out_ptr.is_null() && out_len > 0 {
        std::ptr::copy_nonoverlapping(out.as_ptr(), out_ptr, out_len);
    }
    ((out_ptr as u32 as u64) << 32) | (out_len as u32 as u64)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wasm_dispatch_roundtrip() {
        let ver: Value = serde_json::from_str(&dispatch_json("version", "")).unwrap();
        assert_eq!(ver["definitionsVersion"].as_str(), Some(DEFINITIONS_VERSION));

        let color: Value = serde_json::from_str(&dispatch_json("parse_color", "#1FA85E")).unwrap();
        assert_eq!(color["r"].as_u64(), Some(31));
        assert_eq!(color["g"].as_u64(), Some(168));
        assert_eq!(color["b"].as_u64(), Some(94));
    }
}
