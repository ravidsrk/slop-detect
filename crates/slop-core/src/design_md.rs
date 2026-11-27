//! DESIGN.md & W3C DTCG 2025.10 tokens.json parser, static linter, token differ, and rendered compliance scorer.

use crate::color::{contrast_ratio, delta_e_oklab, is_dark, is_purple, parse_color, ParsedColor};
use crate::design::{score_patterns, DesignScoreResult, PatternInput};
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use std::collections::{BTreeMap, HashMap, HashSet};

pub const DESIGN_MD_SPEC_VERSION: &str = "alpha";

pub fn extract_front_matter(text: &str) -> Option<String> {
    let trimmed = text.trim_start_matches('\u{FEFF}').trim_start();
    if let Some(rest) = trimmed
        .strip_prefix("---\r\n")
        .or_else(|| trimmed.strip_prefix("---\n"))
    {
        if let Some(idx) = rest.find("\n---") {
            let body = rest[..idx].trim_end_matches('\r');
            return Some(body.to_string());
        }
    }
    // Fallback: ```yaml ... ``` fenced block
    let lower = text.to_ascii_lowercase();
    for fence in ["```yaml\n", "```yaml\r\n", "```yml\n", "```yml\r\n"] {
        if let Some(start) = lower.find(fence) {
            let after = &text[start + fence.len()..];
            if let Some(end) = after.find("\n```") {
                return Some(after[..end].trim_end_matches('\r').to_string());
            }
        }
    }
    None
}

/// Minimal YAML-subset reader matching packages/core/src/system.ts `parseYamlSubset`.
pub fn parse_yaml_subset(src: &str) -> Map<String, Value> {
    let mut root = Map::new();
    let mut path_stack: Vec<(isize, Vec<String>)> = vec![(-1, vec![])];

    for raw_line in src.lines() {
        let trimmed = raw_line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') || trimmed.starts_with("- ") {
            continue;
        }
        let indent = raw_line.chars().take_while(|c| *c == ' ').count() as isize;
        let Some(colon_idx) = trimmed.find(':') else {
            continue;
        };
        if colon_idx == 0 {
            continue;
        }
        let key = trimmed[..colon_idx]
            .trim()
            .trim_matches(|c| c == '\'' || c == '"')
            .to_string();
        let raw_val = trimmed[colon_idx + 1..].trim();

        while path_stack.len() > 1 && indent <= path_stack.last().unwrap().0 {
            path_stack.pop();
        }
        let parent_path = path_stack.last().unwrap().1.clone();

        if raw_val.is_empty() {
            let mut next_path = parent_path.clone();
            next_path.push(key.clone());
            insert_at_path(&mut root, &parent_path, key, Value::Object(Map::new()));
            path_stack.push((indent, next_path));
            continue;
        }

        let value = parse_yaml_scalar(raw_val);
        insert_at_path(&mut root, &parent_path, key, Value::String(value));
    }

    root
}

fn parse_yaml_scalar(raw: &str) -> String {
    if let Some(rest) = raw.strip_prefix('"') {
        let mut out = String::new();
        let mut chars = rest.chars();
        while let Some(c) = chars.next() {
            if c == '\\' {
                if let Some(next) = chars.next() {
                    out.push(next);
                }
            } else if c == '"' {
                break;
            } else {
                out.push(c);
            }
        }
        return out;
    }
    if let Some(rest) = raw.strip_prefix('\'') {
        let mut out = String::new();
        let mut chars = rest.chars().peekable();
        while let Some(c) = chars.next() {
            if c == '\'' {
                if chars.peek() == Some(&'\'') {
                    chars.next();
                    out.push('\'');
                } else {
                    break;
                }
            } else {
                out.push(c);
            }
        }
        return out;
    }
    // Strip trailing comment unless `#hex` color
    let bytes = raw.as_bytes();
    for i in 1..bytes.len() {
        if bytes[i] == b'#' && bytes[i - 1].is_ascii_whitespace() {
            let after = &raw[i + 1..];
            let tok = after.split_whitespace().next().unwrap_or("");
            let is_hex = matches!(tok.len(), 3 | 4 | 6 | 8)
                && tok.chars().all(|c| c.is_ascii_hexdigit());
            if !is_hex {
                return raw[..i].trim().to_string();
            }
        }
    }
    raw.to_string()
}

fn insert_at_path(root: &mut Map<String, Value>, path: &[String], key: String, val: Value) {
    let mut cur = root;
    for seg in path {
        cur = cur
            .entry(seg.clone())
            .or_insert_with(|| Value::Object(Map::new()))
            .as_object_mut()
            .unwrap();
    }
    cur.insert(key, val);
}

fn lookup_scalar(root: &Map<String, Value>, path: &str) -> Option<String> {
    let mut cur: &Value = &Value::Object(root.clone());
    for seg in path.split('.') {
        cur = cur.as_object()?.get(seg)?;
    }
    match cur {
        Value::String(s) => Some(s.clone()),
        Value::Number(n) => Some(n.to_string()),
        _ => None,
    }
}

#[derive(Debug, Clone)]
struct BrokenRef {
    from: String,
    target: String,
    is_cycle: bool,
}

fn resolve_refs_with_diagnostics(tree: &mut Map<String, Value>) -> (Vec<BrokenRef>, HashSet<String>) {
    let mut broken = Vec::new();
    let mut referenced = HashSet::new();

    // Collect leaf paths in insertion order so mutations match JS walk() order
    let mut leaf_paths: Vec<Vec<String>> = Vec::new();
    fn collect_leaves(node: &Map<String, Value>, prefix: &mut Vec<String>, out: &mut Vec<Vec<String>>) {
        for (k, v) in node {
            prefix.push(k.clone());
            if let Some(obj) = v.as_object() {
                collect_leaves(obj, prefix, out);
            } else if v.is_string() {
                out.push(prefix.clone());
            }
            prefix.pop();
        }
    }
    collect_leaves(tree, &mut Vec::new(), &mut leaf_paths);

    for parts in leaf_paths {
        let full_path = parts.join(".");
        let Some(initial) = lookup_scalar(tree, &full_path) else {
            continue;
        };
        let mut cur = initial;
        let mut visited: HashSet<String> = HashSet::new();
        visited.insert(full_path.clone());
        let mut hops = 0;
        while hops < 8 {
            hops += 1;
            let Some(inner) = cur.strip_prefix('{').and_then(|s| s.strip_suffix('}')) else {
                break;
            };
            if inner.is_empty()
                || !inner
                    .chars()
                    .all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '.' | '-'))
            {
                break;
            }
            let target_path = inner.to_string();
            referenced.insert(target_path.clone());
            if visited.contains(&target_path) {
                broken.push(BrokenRef {
                    from: full_path.clone(),
                    target: target_path,
                    is_cycle: true,
                });
                break;
            }
            visited.insert(target_path.clone());
            match lookup_scalar(tree, &target_path) {
                Some(resolved) => cur = resolved,
                None => {
                    broken.push(BrokenRef {
                        from: full_path.clone(),
                        target: target_path,
                        is_cycle: false,
                    });
                    break;
                }
            }
        }
        set_scalar_at_path(tree, &parts, cur);
    }

    (broken, referenced)
}

fn set_scalar_at_path(root: &mut Map<String, Value>, parts: &[String], val: String) {
    let mut cur = root;
    for seg in &parts[..parts.len() - 1] {
        let Some(next) = cur.get_mut(seg).and_then(|v| v.as_object_mut()) else {
            return;
        };
        cur = next;
    }
    if let Some(last) = parts.last() {
        cur.insert(last.clone(), Value::String(val));
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesignMdLintIssue {
    pub rule_id: String,
    pub severity: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesignMdLintResult {
    pub valid: bool,
    pub spec_version: String,
    pub errors: Vec<DesignMdLintIssue>,
    pub warnings: Vec<DesignMdLintIssue>,
    pub issues: Vec<DesignMdLintIssue>,
}

pub fn lint_design_md(text: &str) -> DesignMdLintResult {
    let Some(fm) = extract_front_matter(text) else {
        let err = DesignMdLintIssue {
            rule_id: "broken-ref".to_string(),
            severity: "error".to_string(),
            path: None,
            message: "No parseable YAML front matter or ```yaml block found in DESIGN.md."
                .to_string(),
        };
        return DesignMdLintResult {
            valid: false,
            spec_version: DESIGN_MD_SPEC_VERSION.to_string(),
            errors: vec![err.clone()],
            warnings: vec![],
            issues: vec![err],
        };
    };

    let mut tree = parse_yaml_subset(&fm);
    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    let declared_spec_version = tree
        .get("specVersion")
        .and_then(|v| v.as_str())
        .unwrap_or(DESIGN_MD_SPEC_VERSION)
        .to_string();

    if declared_spec_version != DESIGN_MD_SPEC_VERSION {
        warnings.push(DesignMdLintIssue {
            rule_id: "spec-version-mismatch".to_string(),
            severity: "warning".to_string(),
            path: Some("specVersion".to_string()),
            message: format!(
                "DESIGN.md declares specVersion \"{}\", expected \"{}\".",
                declared_spec_version, DESIGN_MD_SPEC_VERSION
            ),
        });
    }

    let (broken_refs, referenced_paths) = resolve_refs_with_diagnostics(&mut tree);
    for br in broken_refs {
        errors.push(DesignMdLintIssue {
            rule_id: "broken-ref".to_string(),
            severity: "error".to_string(),
            path: Some(br.from.clone()),
            message: if br.is_cycle {
                format!(
                    "Circular token reference \"{{{}}}\" at \"{}\".",
                    br.target, br.from
                )
            } else {
                format!(
                    "Unresolved token reference \"{{{}}}\" at \"{}\".",
                    br.target, br.from
                )
            },
        });
    }

    // Rule 2: component contrast < 4.5:1
    if let Some(components) = tree.get("components").and_then(|v| v.as_object()) {
        for (comp_name, comp_val) in components {
            let Some(comp) = comp_val.as_object() else {
                continue;
            };
            let bg_str = comp
                .get("backgroundColor")
                .or_else(|| comp.get("background"))
                .and_then(|v| v.as_str());
            let fg_str = comp
                .get("textColor")
                .or_else(|| comp.get("color"))
                .and_then(|v| v.as_str());
            if let (Some(bg_s), Some(fg_s)) = (bg_str, fg_str) {
                if let (Some(bg), Some(fg)) = (parse_color(bg_s), parse_color(fg_s)) {
                    let cr = contrast_ratio(&fg, &bg);
                    if cr < 4.5 {
                        errors.push(DesignMdLintIssue {
                            rule_id: "contrast-ratio".to_string(),
                            severity: "error".to_string(),
                            path: Some(format!("components.{}", comp_name)),
                            message: format!(
                                "Component \"{}\" foreground ({}) on background ({}) has contrast {:.2}:1 (< 4.5:1 WCAG AA minimum).",
                                comp_name, fg_s, bg_s, cr
                            ),
                        });
                    }
                }
            }
        }
    }

    // Rule 3: orphaned tokens in colors
    let has_components = tree
        .get("components")
        .and_then(|v| v.as_object())
        .is_some_and(|c| !c.is_empty());
    if has_components && !referenced_paths.is_empty() {
        if let Some(colors) = tree.get("colors").and_then(|v| v.as_object()) {
            fn check_orphans(
                node: &Map<String, Value>,
                prefix: &str,
                referenced: &HashSet<String>,
                warnings: &mut Vec<DesignMdLintIssue>,
            ) {
                for (k, v) in node {
                    let full = format!("{}.{}", prefix, k);
                    if let Some(obj) = v.as_object() {
                        check_orphans(obj, &full, referenced, warnings);
                    } else if !referenced.contains(&full) {
                        warnings.push(DesignMdLintIssue {
                            rule_id: "orphaned-tokens".to_string(),
                            severity: "warning".to_string(),
                            path: Some(full.clone()),
                            message: format!(
                                "Token \"{}\" is declared in colors but never referenced by any component.",
                                full
                            ),
                        });
                    }
                }
            }
            check_orphans(colors, "colors", &referenced_paths, &mut warnings);
        }
    }

    let mut issues = errors.clone();
    issues.extend(warnings.clone());
    DesignMdLintResult {
        valid: errors.is_empty(),
        spec_version: declared_spec_version,
        errors,
        warnings,
        issues,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffEntry {
    pub path: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffChangedEntry {
    pub path: String,
    pub before: String,
    pub after: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DesignMdDiffResult {
    pub added: Vec<DiffEntry>,
    pub removed: Vec<DiffEntry>,
    pub changed: Vec<DiffChangedEntry>,
    pub breaking: bool,
}

pub fn diff_design_md(base_text: &str, head_text: &str) -> DesignMdDiffResult {
    let mut base_tree = extract_front_matter(base_text)
        .map(|fm| parse_yaml_subset(&fm))
        .unwrap_or_default();
    let mut head_tree = extract_front_matter(head_text)
        .map(|fm| parse_yaml_subset(&fm))
        .unwrap_or_default();
    resolve_refs_with_diagnostics(&mut base_tree);
    resolve_refs_with_diagnostics(&mut head_tree);

    fn flatten(node: &Map<String, Value>, prefix: &str, out: &mut Vec<(String, String)>) {
        for (k, v) in node {
            let p = if prefix.is_empty() {
                k.clone()
            } else {
                format!("{}.{}", prefix, k)
            };
            if let Some(obj) = v.as_object() {
                flatten(obj, &p, out);
            } else if let Some(s) = v.as_str() {
                out.push((p, s.to_string()));
            } else {
                out.push((p, v.to_string()));
            }
        }
    }

    let mut b_list = Vec::new();
    let mut h_list = Vec::new();
    flatten(&base_tree, "", &mut b_list);
    flatten(&head_tree, "", &mut h_list);

    let b_map: HashMap<String, String> = b_list.iter().cloned().collect();
    let h_map: HashMap<String, String> = h_list.iter().cloned().collect();

    let mut added = Vec::new();
    let mut removed = Vec::new();
    let mut changed = Vec::new();

    for (k, v) in &h_list {
        match b_map.get(k) {
            None => added.push(DiffEntry {
                path: k.clone(),
                value: v.clone(),
            }),
            Some(old) if old != v => changed.push(DiffChangedEntry {
                path: k.clone(),
                before: old.clone(),
                after: v.clone(),
            }),
            _ => {}
        }
    }
    for (k, v) in &b_list {
        if !h_map.contains_key(k) {
            removed.push(DiffEntry {
                path: k.clone(),
                value: v.clone(),
            });
        }
    }

    let breaking = !removed.is_empty() || !changed.is_empty();
    DesignMdDiffResult {
        added,
        removed,
        changed,
        breaking,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsedDesignSystem {
    pub name: Option<String>,
    pub spec_version: String,
    pub colors: Map<String, Value>,
    pub typography: Map<String, Value>,
    pub rounded: Map<String, Value>,
    pub spacing: Map<String, Value>,
    pub shadows: Map<String, Value>,
    pub components: Map<String, Value>,
}

pub fn parse_design_md(text: &str) -> Option<ParsedDesignSystem> {
    let Some(fm) = extract_front_matter(text) else {
        if text.trim_start().starts_with('{') {
            return parse_dtcg_tokens(text);
        }
        return None;
    };
    let mut tree = parse_yaml_subset(&fm);
    resolve_refs_with_diagnostics(&mut tree);
    let has_tokens = [
        "colors",
        "typography",
        "rounded",
        "spacing",
        "components",
        "shadows",
        "boxShadow",
    ]
    .iter()
    .any(|k| tree.get(*k).and_then(|v| v.as_object()).is_some_and(|o| !o.is_empty()));
    if !has_tokens {
        return None;
    }

    let get_obj = |k: &str| {
        tree.get(k)
            .and_then(|v| v.as_object())
            .cloned()
            .unwrap_or_default()
    };
    let shadows = if tree.contains_key("shadows") {
        get_obj("shadows")
    } else {
        get_obj("boxShadow")
    };

    Some(ParsedDesignSystem {
        name: tree.get("name").and_then(|v| v.as_str()).map(|s| s.to_string()),
        spec_version: tree
            .get("specVersion")
            .and_then(|v| v.as_str())
            .unwrap_or(DESIGN_MD_SPEC_VERSION)
            .to_string(),
        colors: get_obj("colors"),
        typography: get_obj("typography"),
        rounded: get_obj("rounded"),
        spacing: get_obj("spacing"),
        shadows,
        components: get_obj("components"),
    })
}

fn dtcg_color_to_css(val: &Value) -> Option<String> {
    if let Some(s) = val.as_str() {
        return Some(s.trim().to_string());
    }
    let obj = val.as_object()?;
    let alpha = obj.get("alpha").and_then(|v| v.as_f64()).unwrap_or(1.0);
    if let Some(hex) = obj.get("hex").and_then(|v| v.as_str()) {
        if !hex.trim().is_empty() && (alpha - 1.0).abs() < 1e-6 {
            return Some(hex.trim().to_string());
        }
    }
    let space = obj
        .get("colorSpace")
        .and_then(|v| v.as_str())
        .unwrap_or("srgb")
        .to_ascii_lowercase();
    let comps = obj.get("components").and_then(|v| v.as_array())?;
    if comps.len() < 3 {
        return obj.get("hex").and_then(|v| v.as_str()).map(|s| s.trim().to_string());
    }
    let c = |idx: usize| comps[idx].as_f64().unwrap_or(0.0);
    let (c0, c1, c2) = (c(0), c(1), c(2));
    match space.as_str() {
        "oklch" => Some(if alpha < 1.0 {
            format!("oklch({} {} {} / {})", c0, c1, c2, alpha)
        } else {
            format!("oklch({} {} {})", c0, c1, c2)
        }),
        "oklab" => Some(if alpha < 1.0 {
            format!("oklab({} {} {} / {})", c0, c1, c2, alpha)
        } else {
            format!("oklab({} {} {})", c0, c1, c2)
        }),
        "srgb" => {
            let scale = if c0 <= 1.0 && c1 <= 1.0 && c2 <= 1.0 && (c0 > 0.0 || c1 > 0.0 || c2 > 0.0) {
                255.0
            } else {
                1.0
            };
            let (r, g, b) = ((c0 * scale).round() as u8, (c1 * scale).round() as u8, (c2 * scale).round() as u8);
            Some(if alpha < 1.0 {
                format!("rgba({}, {}, {}, {})", r, g, b, alpha)
            } else {
                format!("rgb({}, {}, {})", r, g, b)
            })
        }
        _ => Some(format!("color({} {} {} {})", space, c0, c1, c2)),
    }
}

fn dtcg_dimension_to_css(val: &Value) -> Option<String> {
    if let Some(n) = val.as_f64() {
        return Some(format!("{}px", n));
    }
    if let Some(s) = val.as_str() {
        return Some(s.trim().to_string());
    }
    let obj = val.as_object()?;
    let n = obj.get("value")?.as_f64()?;
    let unit = obj.get("unit").and_then(|v| v.as_str()).unwrap_or("px");
    if (n - n.round()).abs() < 1e-9 {
        Some(format!("{}{}", n.round() as i64, unit))
    } else {
        Some(format!("{}{}", n, unit))
    }
}

pub fn parse_dtcg_tokens(input: &str) -> Option<ParsedDesignSystem> {
    let raw: Value = serde_json::from_str(input.trim()).ok()?;
    let raw_obj = raw.as_object()?;

    #[derive(Clone)]
    struct FlatTok {
        tok_type: String,
        value: Value,
    }
    let mut flat: BTreeMap<String, FlatTok> = BTreeMap::new();

    fn walk(node: &Map<String, Value>, parts: &mut Vec<String>, inherited: Option<&str>, flat: &mut BTreeMap<String, FlatTok>) {
        let cur_type = node
            .get("$type")
            .and_then(|v| v.as_str())
            .or(inherited);
        if let Some(val) = node.get("$value") {
            let path = parts.join(".");
            let tok_type = cur_type.unwrap_or("unknown").to_string();
            flat.insert(
                path,
                FlatTok {
                    tok_type,
                    value: val.clone(),
                },
            );
            return;
        }
        for (k, v) in node {
            if k.starts_with('$') {
                continue;
            }
            if let Some(obj) = v.as_object() {
                parts.push(k.clone());
                walk(obj, parts, cur_type, flat);
                parts.pop();
            }
        }
    }
    walk(raw_obj, &mut Vec::new(), None, &mut flat);

    fn resolve_val(path: &str, flat: &BTreeMap<String, FlatTok>, depth: usize) -> Option<Value> {
        if depth > 8 {
            return None;
        }
        let entry = flat.get(path)?;
        if let Some(s) = entry.value.as_str() {
            let trimmed = s.trim();
            if let Some(alias) = trimmed.strip_prefix('{').and_then(|x| x.strip_suffix('}')) {
                return resolve_val(alias, flat, depth + 1);
            }
        }
        Some(entry.value.clone())
    }

    let mut colors = Map::new();
    let mut typography = Map::new();
    let mut rounded = Map::new();
    let mut spacing = Map::new();
    let shadows = Map::new();

    for (path, entry) in &flat {
        let Some(resolved) = resolve_val(path, &flat, 0) else {
            continue;
        };
        let short_key = path.replace('.', "_");
        match entry.tok_type.as_str() {
            "color" => {
                if let Some(css) = dtcg_color_to_css(&resolved) {
                    colors.insert(short_key, Value::String(css));
                }
            }
            "fontFamily" => {
                let fam = if let Some(arr) = resolved.as_array() {
                    arr.iter()
                        .filter_map(|v| v.as_str())
                        .collect::<Vec<_>>()
                        .join(", ")
                } else {
                    resolved.as_str().unwrap_or_default().to_string()
                };
                let mut m = Map::new();
                m.insert("fontFamily".to_string(), Value::String(fam));
                typography.insert(short_key, Value::Object(m));
            }
            "dimension" => {
                if let Some(dim) = dtcg_dimension_to_css(&resolved) {
                    let lower = path.to_ascii_lowercase();
                    if lower.contains("radius") || lower.contains("rounded") || lower.contains("corner") {
                        rounded.insert(short_key, Value::String(dim));
                    } else {
                        spacing.insert(short_key, Value::String(dim));
                    }
                }
            }
            _ => {}
        }
    }

    let name = raw_obj
        .get("$name")
        .or_else(|| raw_obj.get("name"))
        .and_then(|v| v.as_str())
        .unwrap_or("DTCG Tokens")
        .to_string();

    Some(ParsedDesignSystem {
        name: Some(name),
        spec_version: "2025.10".to_string(),
        colors,
        typography,
        rounded,
        spacing,
        shadows,
        components: Map::new(),
    })
}

pub fn parse_length_px(val: &Value, root_px: f64) -> Option<f64> {
    if let Some(n) = val.as_f64() {
        return if n.is_finite() { Some(n) } else { None };
    }
    let s = val.as_str()?.trim().to_ascii_lowercase();
    if s.is_empty()
        || s.contains("clamp(")
        || s.contains("calc(")
        || s.contains("vw")
        || s.contains("vh")
        || s.contains('%')
    {
        return None;
    }
    if let Some(n) = s.strip_suffix("rem").or_else(|| s.strip_suffix("em")) {
        return n.trim().parse::<f64>().ok().map(|v| v * root_px);
    }
    let num_str = s.strip_suffix("px").unwrap_or(&s).trim();
    num_str.parse::<f64>().ok()
}

pub fn primary_family(stack: &str) -> Option<String> {
    const GENERICS: &[&str] = &[
        "sans-serif",
        "serif",
        "monospace",
        "cursive",
        "fantasy",
        "system-ui",
        "ui-sans-serif",
        "ui-serif",
        "ui-monospace",
        "ui-rounded",
        "-apple-system",
        "blinkmacsystemfont",
        "emoji",
        "math",
    ];
    for part in stack.split(',') {
        let f = part.replace(['\'', '"'], "").trim().to_ascii_lowercase();
        if !f.is_empty() && !GENERICS.contains(&f.as_str()) {
            return Some(f);
        }
    }
    None
}

#[derive(Debug, Clone, Default)]
pub struct FlattenedTokens {
    pub fonts: Vec<String>,
    pub colors: Vec<String>,
    pub radii: Vec<f64>,
    pub spacing: Vec<f64>,
    pub font_sizes: Vec<f64>,
    pub typography_styles: Vec<TypoStyle>,
}

#[derive(Debug, Clone)]
pub struct TypoStyle {
    pub font_family: Option<String>,
    pub font_size: Option<f64>,
    pub line_height: Option<f64>,
}

pub fn flatten_design_tokens(parsed: &ParsedDesignSystem) -> FlattenedTokens {
    let mut out = FlattenedTokens::default();
    let mut font_set = HashSet::new();

    for (_k, v) in &parsed.typography {
        if let Some(obj) = v.as_object() {
            let fam = obj
                .get("fontFamily")
                .and_then(|s| s.as_str())
                .and_then(primary_family);
            if let Some(ref f) = fam {
                if font_set.insert(f.clone()) {
                    out.fonts.push(f.clone());
                }
            }
            let fs = obj.get("fontSize").and_then(|v| parse_length_px(v, 16.0));
            if let Some(px) = fs {
                if !out.font_sizes.contains(&px) {
                    out.font_sizes.push(px);
                }
            }
            let lh = obj
                .get("lineHeight")
                .and_then(|v| v.as_f64().or_else(|| v.as_str().and_then(|s| s.parse().ok())));
            if fam.is_some() || fs.is_some() || lh.is_some() {
                out.typography_styles.push(TypoStyle {
                    font_family: fam,
                    font_size: fs,
                    line_height: lh,
                });
            }
        } else if let Some(s) = v.as_str() {
            if let Some(px) = parse_length_px(v, 16.0) {
                if !out.font_sizes.contains(&px) {
                    out.font_sizes.push(px);
                }
            } else if let Some(f) = primary_family(s) {
                if font_set.insert(f.clone()) {
                    out.fonts.push(f);
                }
            }
        }
    }

    fn walk_colors(node: &Map<String, Value>, out: &mut Vec<String>) {
        for v in node.values() {
            if let Some(obj) = v.as_object() {
                walk_colors(obj, out);
            } else if let Some(s) = v.as_str() {
                if !s.trim().is_empty() {
                    out.push(s.trim().to_string());
                }
            }
        }
    }
    walk_colors(&parsed.colors, &mut out.colors);

    for v in parsed.components.values() {
        if let Some(obj) = v.as_object() {
            for k in ["backgroundColor", "textColor", "borderColor"] {
                if let Some(s) = obj.get(k).and_then(|c| c.as_str()) {
                    if !s.trim().is_empty() {
                        out.colors.push(s.trim().to_string());
                    }
                }
            }
        }
    }

    fn walk_lengths(node: &Map<String, Value>, out: &mut Vec<f64>) {
        for v in node.values() {
            if let Some(obj) = v.as_object() {
                walk_lengths(obj, out);
            } else if let Some(px) = parse_length_px(v, 16.0) {
                if !out.contains(&px) {
                    out.push(px);
                }
            }
        }
    }
    walk_lengths(&parsed.rounded, &mut out.radii);
    walk_lengths(&parsed.spacing, &mut out.spacing);

    out
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColorMatchStatus {
    pub status: &'static str,
    pub delta_e: f64,
    pub closest_token: Option<String>,
}

pub fn best_color_match(palette: &[String], observed: &str) -> ColorMatchStatus {
    let obs_c = parse_color(observed);
    let mut best_de = f64::INFINITY;
    let mut best_da = 1.0f64;
    let mut best_tok = None;

    for tok in palette {
        if let (Some(ca), Some(cb)) = (parse_color(tok), obs_c) {
            let de = delta_e_oklab(&ca, &cb);
            let da = (ca.a - cb.a).abs();
            if de < best_de || ((de - best_de).abs() < 1e-12 && da < best_da) {
                best_de = de;
                best_da = da;
                best_tok = Some(tok.clone());
            }
        } else if tok.trim().eq_ignore_ascii_case(observed.trim()) {
            best_de = 0.0;
            best_da = 0.0;
            best_tok = Some(tok.clone());
        }
    }

    let status = if best_de <= 0.02 && best_da <= 0.02 {
        "match"
    } else if best_de <= 0.05 && best_da <= 0.05 {
        "near-miss"
    } else {
        "off-palette"
    };

    ColorMatchStatus {
        status,
        delta_e: if best_de.is_finite() {
            (best_de * 10000.0).round() / 10000.0
        } else {
            1.0
        },
        closest_token: best_tok,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemCheckResult {
    pub id: String,
    pub weight: u32,
    pub status: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemComplianceResult {
    pub declared: bool,
    pub score: Option<u32>,
    pub tier: String,
    pub checks: Vec<SystemCheckResult>,
    pub drift_ids: Vec<String>,
}

/// Score rendered DOM observations against a parsed DESIGN.md / DTCG system.
pub fn score_system_compliance(
    parsed: Option<&ParsedDesignSystem>,
    observed: &Value,
) -> SystemComplianceResult {
    let Some(parsed) = parsed else {
        return SystemComplianceResult {
            declared: false,
            score: None,
            tier: "No system".to_string(),
            checks: vec![],
            drift_ids: vec![],
        };
    };

    let tokens = flatten_design_tokens(parsed);
    let mut checks: Vec<SystemCheckResult> = Vec::new();
    let mut drift_ids: Vec<String> = Vec::new();

    let mut push = |id: &str, weight: u32, status: &str, msg: String| {
        if status == "fail" {
            drift_ids.push(id.to_string());
        }
        checks.push(SystemCheckResult {
            id: id.to_string(),
            weight,
            status: status.to_string(),
            message: msg,
        });
    };

    // 1. fonts.declared (25)
    {
        let tally = observed.get("fonts").and_then(|v| v.as_object());
        let total: f64 = tally
            .map(|m| m.values().filter_map(|v| v.as_f64()).sum())
            .unwrap_or(0.0);
        if tokens.fonts.is_empty() || total <= 0.0 {
            push("fonts.declared", 25, "skip", "no typography tokens or text observed".to_string());
        } else {
            let mut used: HashMap<String, f64> = HashMap::new();
            for (stack, n) in tally.unwrap() {
                if let (Some(fam), Some(cnt)) = (primary_family(stack), n.as_f64()) {
                    *used.entry(fam).or_insert(0.0) += cnt;
                }
            }
            let undeclared: Vec<String> = used
                .into_iter()
                .filter(|(fam, cnt)| cnt / total >= 0.1 && !tokens.fonts.contains(fam))
                .map(|(fam, _)| fam)
                .collect();
            if undeclared.is_empty() {
                push("fonts.declared", 25, "pass", "all primary fonts are declared".to_string());
            } else {
                push(
                    "fonts.declared",
                    25,
                    "fail",
                    format!("font(s) in use but not in the system: {}", undeclared.join(", ")),
                );
            }
        }
    }

    // 2. colors.cta (20)
    {
        let ctas = observed.get("ctas").and_then(|v| v.as_array());
        if tokens.colors.is_empty() || ctas.is_none_or(|a| a.is_empty()) {
            push("colors.cta", 20, "skip", "no color tokens or filled CTAs observed".to_string());
        } else {
            let ctas = ctas.unwrap();
            let off_count = ctas
                .iter()
                .filter(|c| {
                    c.get("bg")
                        .and_then(|v| v.as_str())
                        .is_some_and(|bg| best_color_match(&tokens.colors, bg).status == "off-palette")
                })
                .count();
            if off_count > 0 {
                push(
                    "colors.cta",
                    20,
                    "fail",
                    format!("{}/{} CTA color(s) not in the palette", off_count, ctas.len()),
                );
            } else {
                push("colors.cta", 20, "pass", format!("all {} CTA colors match the palette", ctas.len()));
            }
        }
    }

    // 3. colors.surface (10)
    {
        let surface = observed.get("surface").and_then(|v| v.as_str());
        if tokens.colors.is_empty() || surface.is_none_or(|s| s.is_empty()) {
            push("colors.surface", 10, "skip", "no surface color observed".to_string());
        } else {
            let surf = surface.unwrap();
            let cmp = best_color_match(&tokens.colors, surf);
            if cmp.status == "off-palette" {
                push("colors.surface", 10, "fail", format!("surface {} is not in the palette", surf));
            } else {
                push("colors.surface", 10, "pass", "surface color matches the palette".to_string());
            }
        }
    }

    // 4. colors.headings (10)
    {
        let hs = observed.get("headings").and_then(|v| v.as_array());
        if tokens.colors.is_empty() || hs.is_none_or(|a| a.is_empty()) {
            push("colors.headings", 10, "skip", "no headings observed".to_string());
        } else {
            let hs = hs.unwrap();
            let off_count = hs
                .iter()
                .filter(|h| {
                    h.get("color")
                        .and_then(|v| v.as_str())
                        .is_some_and(|col| best_color_match(&tokens.colors, col).status == "off-palette")
                })
                .count();
            if (off_count as f64) > (hs.len() as f64) / 2.0 {
                push(
                    "colors.headings",
                    10,
                    "fail",
                    format!("{}/{} heading color(s) not in the palette", off_count, hs.len()),
                );
            } else {
                push("colors.headings", 10, "pass", "heading colors match the palette".to_string());
            }
        }
    }

    // 5. radii.scale (10)
    {
        let radii: Vec<f64> = observed
            .get("radii")
            .and_then(|v| v.as_array())
            .map(|a| a.iter().filter_map(|v| v.as_f64()).collect())
            .unwrap_or_default();
        if tokens.radii.is_empty() || radii.is_empty() {
            push("radii.scale", 10, "skip", "no rounded tokens or radii observed".to_string());
        } else {
            let off_count = radii
                .iter()
                .filter(|r| !tokens.radii.iter().any(|t| (t - *r).abs() <= 2.0))
                .count();
            if (off_count as f64) > (radii.len() as f64) / 2.0 {
                push("radii.scale", 10, "fail", "radii off the declared scale".to_string());
            } else {
                push("radii.scale", 10, "pass", "corner radii follow the declared scale".to_string());
            }
        }
    }

    // 6. spacing.scale (10)
    {
        let spacings: Vec<f64> = observed
            .get("spacings")
            .and_then(|v| v.as_array())
            .map(|a| a.iter().filter_map(|v| v.as_f64()).collect())
            .unwrap_or_default();
        if tokens.spacing.is_empty() || spacings.is_empty() {
            push("spacing.scale", 10, "skip", "no spacing tokens or values observed".to_string());
        } else {
            let off_count = spacings
                .iter()
                .filter(|s| !tokens.spacing.iter().any(|t| (t - *s).abs() <= 1.0))
                .count();
            if (off_count as f64) > (spacings.len() as f64) / 2.0 {
                push("spacing.scale", 10, "fail", "spacing values off the declared scale".to_string());
            } else {
                push("spacing.scale", 10, "pass", "spacing values follow the declared scale".to_string());
            }
        }
    }

    // 7. typography.scale (10)
    {
        let sizes: Vec<f64> = observed
            .get("fontSizes")
            .and_then(|v| v.as_array())
            .map(|a| a.iter().filter_map(|v| v.as_f64()).collect())
            .unwrap_or_default();
        if tokens.font_sizes.is_empty() || sizes.is_empty() {
            push("typography.scale", 10, "skip", "no type scale tokens or font sizes observed".to_string());
        } else {
            let off_count = sizes
                .iter()
                .filter(|sz| !tokens.font_sizes.iter().any(|t| (t - *sz).abs() <= 0.5))
                .count();
            if (off_count as f64) > (sizes.len() as f64) / 2.0 {
                push("typography.scale", 10, "fail", "font sizes off the declared type scale".to_string());
            } else {
                push("typography.scale", 10, "pass", "font sizes follow the declared type scale".to_string());
            }
        }
    }

    // 8. typography.styles (5)
    {
        let styles = observed.get("typographyStyles").and_then(|v| v.as_array());
        let composite_decls: Vec<&TypoStyle> = tokens
            .typography_styles
            .iter()
            .filter(|d| d.font_size.is_some())
            .collect();
        if composite_decls.is_empty() || styles.is_none_or(|a| a.is_empty()) {
            push("typography.styles", 5, "skip", "no composite typography styles observed".to_string());
        } else {
            let styles = styles.unwrap();
            let matched = styles
                .iter()
                .filter(|obs| {
                    let obs_fam = obs.get("fontFamily").and_then(|v| v.as_str()).and_then(primary_family);
                    let obs_fs = obs.get("fontSize").and_then(|v| v.as_f64());
                    let obs_lh = obs.get("lineHeight").and_then(|v| v.as_f64());
                    composite_decls.iter().any(|decl| {
                        let fam_ok = match (&decl.font_family, &obs_fam) {
                            (Some(d), Some(o)) => d == o,
                            _ => true,
                        };
                        let fs_ok = match (decl.font_size, obs_fs) {
                            (Some(d), Some(o)) => (d - o).abs() <= 0.5,
                            _ => false,
                        };
                        let lh_ok = match (decl.line_height, obs_lh) {
                            (Some(d), Some(o)) => (d - o).abs() <= 0.08,
                            _ => true,
                        };
                        fam_ok && fs_ok && lh_ok
                    })
                })
                .count();
            if (matched as f64) >= (styles.len() as f64) * 0.5 {
                push("typography.styles", 5, "pass", "composite typography styles match declared tokens".to_string());
            } else {
                push("typography.styles", 5, "fail", "composite typography styles drift from declared tokens".to_string());
            }
        }
    }

    // 9. contrast.componentPairs (0, review)
    push("contrast.componentPairs", 0, "skip", "component pairs checked separately".to_string());

    let applicable: u32 = checks
        .iter()
        .filter(|c| c.weight > 0 && c.status != "skip")
        .map(|c| c.weight)
        .sum();
    let earned: u32 = checks
        .iter()
        .filter(|c| c.weight > 0 && c.status == "pass")
        .map(|c| c.weight)
        .sum();

    let score = if applicable > 0 {
        Some(((earned as f64 / applicable as f64) * 100.0).round() as u32)
    } else {
        None
    };
    let tier = match score {
        None => "No system",
        Some(s) if s >= 80 => "Aligned",
        Some(s) if s >= 50 => "Drifting",
        Some(_) => "Off-system",
    }
    .to_string();

    SystemComplianceResult {
        declared: true,
        score,
        tier,
        checks,
        drift_ids,
    }
}

// ── S-03 (#282): Token-scoped DESIGN.md waivers ──────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WaivedPattern {
    pub id: String,
    pub reason: String,
    pub declared_token: String,
    pub original_weight: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WaivedDesignResult {
    pub raw_score: u32,
    pub raw_tier: String,
    pub waived_patterns: Vec<WaivedPattern>,
    pub design: DesignScoreResult,
}

fn is_cream_surface(c: &ParsedColor) -> bool {
    c.r >= 235 && c.g >= 230 && c.b >= 215 && c.r.saturating_sub(c.b) >= 6
}

fn observed_color_strings(ev: &Value) -> Vec<String> {
    let mut out = Vec::new();
    let Some(obj) = ev.as_object() else {
        return out;
    };
    for key in ["surface", "bodyBg", "background", "bg", "hex", "color", "accent"] {
        if let Some(s) = obj.get(key).and_then(|v| v.as_str()) {
            let t = s.trim();
            if !t.is_empty() {
                out.push(t.to_string());
            }
        }
    }
    if let Some(samples) = obj.get("samples").and_then(|v| v.as_array()) {
        for s in samples {
            if let Some(str_val) = s.as_str() {
                if !str_val.trim().is_empty() {
                    out.push(str_val.trim().to_string());
                }
            } else if let Some(so) = s.as_object() {
                for key in ["bg", "color", "surface", "background"] {
                    if let Some(sv) = so.get(key).and_then(|v| v.as_str()) {
                        if !sv.trim().is_empty() {
                            out.push(sv.trim().to_string());
                        }
                    }
                }
            }
        }
    }
    out
}

fn matching_declared_color<F: Fn(&ParsedColor) -> bool>(
    ev: &Value,
    tokens: &[String],
    accepts: F,
) -> Option<String> {
    let observed: Vec<ParsedColor> = observed_color_strings(ev)
        .iter()
        .filter_map(|s| parse_color(s))
        .collect();
    if observed.is_empty() {
        return None;
    }
    for tok in tokens {
        let Some(parsed) = parse_color(tok) else {
            continue;
        };
        if !accepts(&parsed) {
            continue;
        }
        if observed.iter().any(|seen| delta_e_oklab(seen, &parsed) <= 0.05) {
            return Some(tok.clone());
        }
    }
    None
}

/// Apply S-03 token-scoped DESIGN.md waivers and cleanly recompute the design score.
pub fn apply_design_system_waivers(
    design: &DesignScoreResult,
    parsed: &ParsedDesignSystem,
) -> WaivedDesignResult {
    let tokens = flatten_design_tokens(parsed);
    let mut waived_patterns = Vec::new();
    let mut waived_ids = HashSet::new();

    for p in &design.patterns {
        if !p.triggered {
            continue;
        }
        match p.id.as_str() {
            "purple_accent" => {
                if let Some(tok) = matching_declared_color(&p.evidence, &tokens.colors, is_purple) {
                    waived_ids.insert(p.id.clone());
                    waived_patterns.push(WaivedPattern {
                        id: p.id.clone(),
                        reason: format!("Primary purple accent ({}) is explicitly declared in DESIGN.md", tok),
                        declared_token: tok,
                        original_weight: p.weight,
                    });
                }
            }
            "slop_fonts" | "display_mono_heading" if !tokens.fonts.is_empty() => {
                let hero = p
                    .evidence
                    .get("heroFam")
                    .or_else(|| p.evidence.get("family"))
                    .and_then(|v| v.as_str())
                    .and_then(primary_family);
                if let Some(fam) = hero {
                    if tokens.fonts.iter().any(|f| f == &fam) {
                        waived_ids.insert(p.id.clone());
                        waived_patterns.push(WaivedPattern {
                            id: p.id.clone(),
                            reason: format!("Font family \"{}\" is explicitly declared in DESIGN.md typography", fam),
                            declared_token: fam,
                            original_weight: p.weight,
                        });
                    }
                }
            }
            "perma_dark_mode" => {
                if let Some(tok) = matching_declared_color(&p.evidence, &tokens.colors, is_dark) {
                    waived_ids.insert(p.id.clone());
                    waived_patterns.push(WaivedPattern {
                        id: p.id.clone(),
                        reason: format!("Dark surface token ({}) is explicitly declared in DESIGN.md", tok),
                        declared_token: tok,
                        original_weight: p.weight,
                    });
                }
            }
            "cream_default_bg" | "editorial_cream_kit" => {
                if let Some(tok) =
                    matching_declared_color(&p.evidence, &tokens.colors, is_cream_surface)
                {
                    waived_ids.insert(p.id.clone());
                    waived_patterns.push(WaivedPattern {
                        id: p.id.clone(),
                        reason: format!("Warm cream surface ({}) is explicitly declared in DESIGN.md", tok),
                        declared_token: tok,
                        original_weight: p.weight,
                    });
                }
            }
            "uniform_radius_shadow" if !tokens.radii.is_empty() => {
                let radii_list = tokens
                    .radii
                    .iter()
                    .map(|r| format!("{}", r.round() as i64))
                    .collect::<Vec<_>>()
                    .join(",");
                waived_ids.insert(p.id.clone());
                waived_patterns.push(WaivedPattern {
                    id: p.id.clone(),
                    reason: format!("Border-radius scale ({}px) is explicitly declared in DESIGN.md", radii_list),
                    declared_token: radii_list,
                    original_weight: p.weight,
                });
            }
            _ => {}
        }
    }

    let rescored = if waived_ids.is_empty() {
        design.clone()
    } else {
        let inputs: Vec<PatternInput> = design
            .patterns
            .iter()
            .map(|p| PatternInput {
                id: p.id.clone(),
                label: Some(p.label.clone()),
                weight: Some(p.weight),
                triggered: if waived_ids.contains(&p.id) {
                    false
                } else {
                    p.triggered
                },
                status: None,
                rule_status: Some(p.rule_status.clone()),
                evidence: p.evidence.clone(),
            })
            .collect();
        score_patterns(&inputs)
    };

    WaivedDesignResult {
        raw_score: design.score,
        raw_tier: design.tier.clone(),
        waived_patterns,
        design: rescored,
    }
}

// ── DESIGN.md & W3C DTCG 2025.10 extractors (#332) ───────────────────────────

fn to_hex_color(raw: &str) -> String {
    match parse_color(raw) {
        Some(c) => format!("#{:02X}{:02X}{:02X}", c.r, c.g, c.b),
        None => raw.trim().to_string(),
    }
}

pub fn generate_design_md(observed: &Value, name: Option<&str>, url: Option<&str>) -> String {
    let sys_name = name.unwrap_or("Site Design System");

    let mut fam_counts: HashMap<String, f64> = HashMap::new();
    let mut total_fonts = 0.0f64;
    if let Some(obj) = observed.get("fonts").and_then(|v| v.as_object()) {
        for (stack, cnt) in obj {
            let n = cnt.as_f64().unwrap_or(0.0);
            total_fonts += n;
            if let Some(fam) = primary_family(stack) {
                *fam_counts.entry(fam).or_insert(0.0) += n;
            }
        }
    }
    let mut sorted_fonts: Vec<(String, f64)> = fam_counts
        .into_iter()
        .filter(|(_, n)| total_fonts == 0.0 || n / total_fonts >= 0.05)
        .collect();
    sorted_fonts.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    let h1_fam = observed
        .get("headings")
        .and_then(|v| v.as_array())
        .and_then(|a| a.first())
        .and_then(|h| h.get("fontFamily"))
        .and_then(|v| v.as_str())
        .and_then(primary_family)
        .or_else(|| sorted_fonts.first().map(|(f, _)| f.clone()))
        .unwrap_or_else(|| "system-ui".to_string());
    let body_fam = sorted_fonts
        .first()
        .map(|(f, _)| f.clone())
        .unwrap_or_else(|| h1_fam.clone());

    let surface_hex = observed
        .get("surface")
        .and_then(|v| v.as_str())
        .map(to_hex_color)
        .unwrap_or_else(|| "#FFFFFF".to_string());
    let heading_hex = observed
        .get("headings")
        .and_then(|v| v.as_array())
        .and_then(|a| a.first())
        .and_then(|h| h.get("color"))
        .and_then(|v| v.as_str())
        .map(to_hex_color)
        .unwrap_or_else(|| "#181815".to_string());
    let primary_cta = observed
        .get("ctas")
        .and_then(|v| v.as_array())
        .and_then(|a| a.first())
        .and_then(|c| c.get("bg"))
        .and_then(|v| v.as_str())
        .map(to_hex_color)
        .unwrap_or_else(|| heading_hex.clone());

    // Choose WCAG >= 4.5:1 button text token so generated DESIGN.md passes lint_design_md
    let mut on_primary_line = String::new();
    let mut button_text_ref = "\"{colors.surface}\"";
    if let Some(pc) = parse_color(&primary_cta) {
        let surf_cr = parse_color(&surface_hex)
            .map(|s| contrast_ratio(&s, &pc))
            .unwrap_or(0.0);
        let head_cr = parse_color(&heading_hex)
            .map(|h| contrast_ratio(&h, &pc))
            .unwrap_or(0.0);
        if surf_cr >= 4.5 {
            button_text_ref = "\"{colors.surface}\"";
        } else if head_cr >= 4.5 {
            button_text_ref = "\"{colors.ink}\"";
        } else {
            let white_cr = contrast_ratio(&parse_color("#FFFFFF").unwrap(), &pc);
            let dark_cr = contrast_ratio(&parse_color("#181815").unwrap(), &pc);
            let chosen = if white_cr >= dark_cr { "#FFFFFF" } else { "#181815" };
            on_primary_line = format!("\n  onPrimary: \"{}\"", chosen);
            button_text_ref = "\"{colors.onPrimary}\"";
        }
    }

    let mut radii: Vec<i64> = observed
        .get("radii")
        .and_then(|v| v.as_array())
        .map(|a| {
            a.iter()
                .filter_map(|v| v.as_f64().map(|n| n.round() as i64))
                .collect()
        })
        .unwrap_or_default();
    radii.sort();
    radii.dedup();
    if radii.is_empty() {
        radii = vec![4, 8];
    }
    let radius_keys = ["sm", "md", "lg", "xl", "2xl", "3xl"];
    let radii_yaml: Vec<String> = radii
        .iter()
        .enumerate()
        .map(|(i, r)| {
            let key = radius_keys
                .get(i)
                .map(|s| s.to_string())
                .unwrap_or_else(|| format!("r{}", i + 1));
            format!("  {}: {}px", key, r)
        })
        .collect();

    let url_note = url
        .map(|u| format!("Extracted from live DOM tokens at `{}`.\n\n", u))
        .unwrap_or_default();

    format!(
        "---\nname: \"{}\"\nspecVersion: \"{}\"\ncolors:\n  surface: \"{}\"\n  ink: \"{}\"\n  primary: \"{}\"{}\ntypography:\n  h1:\n    fontFamily: \"{}\"\n  body:\n    fontFamily: \"{}\"\nrounded:\n{}\ncomponents:\n  button-primary:\n    backgroundColor: \"{{colors.primary}}\"\n    textColor: {}\n---\n\n# {} — Design System (`DESIGN.md`)\n\n{}Verify anytime with `slop-detect scan {} --design-md ./DESIGN.md`.\n",
        sys_name.replace('"', "\\\""),
        DESIGN_MD_SPEC_VERSION,
        surface_hex,
        heading_hex,
        primary_cta,
        on_primary_line,
        h1_fam,
        body_fam,
        radii_yaml.join("\n"),
        button_text_ref,
        sys_name,
        url_note,
        url.unwrap_or("<url>")
    )
}

pub fn extract_dtcg_tokens(observed: &Value, name: Option<&str>) -> Value {
    let md = generate_design_md(observed, name, None);
    let parsed = parse_design_md(&md);
    let mut colors_group = Map::new();
    colors_group.insert("$type".to_string(), Value::String("color".to_string()));
    if let Some(ref p) = parsed {
        for (k, v) in &p.colors {
            if let Some(s) = v.as_str() {
                let hex = to_hex_color(s);
                let c = parse_color(&hex).unwrap_or_else(|| parse_color("#000000").unwrap());
                colors_group.insert(
                    k.clone(),
                    json!({
                        "$value": {
                            "colorSpace": "srgb",
                            "components": [
                                ((c.r as f64 / 255.0) * 10000.0).round() / 10000.0,
                                ((c.g as f64 / 255.0) * 10000.0).round() / 10000.0,
                                ((c.b as f64 / 255.0) * 10000.0).round() / 10000.0,
                            ],
                            "hex": hex
                        }
                    }),
                );
            }
        }
    }

    let mut typo_group = Map::new();
    typo_group.insert("$type".to_string(), Value::String("fontFamily".to_string()));
    if let Some(ref p) = parsed {
        for (k, v) in &p.typography {
            if let Some(fam) = v.get("fontFamily").and_then(|f| f.as_str()) {
                typo_group.insert(k.clone(), json!({ "$value": fam }));
            }
        }
    }

    let mut rounded_group = Map::new();
    rounded_group.insert("$type".to_string(), Value::String("dimension".to_string()));
    if let Some(ref p) = parsed {
        for (k, v) in &p.rounded {
            let px = parse_length_px(v, 16.0).unwrap_or(0.0);
            rounded_group.insert(k.clone(), json!({ "$value": { "value": px, "unit": "px" } }));
        }
    }

    json!({
        "$schema": "https://tr.designtokens.org/format/2025.10/schema.json",
        "$name": name.unwrap_or("Site Design System"),
        "colors": colors_group,
        "typography": typo_group,
        "rounded": rounded_group
    })
}
