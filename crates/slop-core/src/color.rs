//! CSS Color 4 parser, Oklab/OKLCH conversion, perceptual Delta-E, and WCAG 2 contrast.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Oklab {
    #[serde(rename = "L")]
    pub l: f64,
    pub a: f64,
    pub b: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Oklch {
    #[serde(rename = "L")]
    pub l: f64,
    #[serde(rename = "C")]
    pub c: f64,
    pub h: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Hsl {
    pub h: f64,
    pub s: f64,
    pub l: f64,
    pub a: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct ParsedColor {
    pub r: u8,
    pub g: u8,
    pub b: u8,
    pub a: f64,
    pub oklab: Oklab,
    pub oklch: Oklch,
}

fn srgb_to_linear(u: f64) -> f64 {
    let abs = u.abs();
    let res = if abs <= 0.04045 {
        abs / 12.92
    } else {
        ((abs + 0.055) / 1.055).powf(2.4)
    };
    if u < 0.0 {
        -res
    } else {
        res
    }
}

fn linear_to_srgb(u: f64) -> f64 {
    let abs = u.abs();
    let res = if abs <= 0.0031308 {
        12.92 * abs
    } else {
        1.055 * abs.powf(1.0 / 2.4) - 0.055
    };
    if u < 0.0 {
        -res
    } else {
        res
    }
}

fn clamp_byte(v: f64) -> u8 {
    v.round().clamp(0.0, 255.0) as u8
}

fn clamp01(v: f64) -> f64 {
    v.clamp(0.0, 1.0)
}

pub fn linear_srgb_to_oklab(lr: f64, lg: f64, lb: f64) -> Oklab {
    let l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
    let m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
    let s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
    let l_ = l.cbrt();
    let m_ = m.cbrt();
    let s_ = s.cbrt();
    Oklab {
        l: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
        a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
        b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
    }
}

pub fn oklab_to_linear_srgb(l: f64, a: f64, b: f64) -> (f64, f64, f64) {
    let l_ = l + 0.3963377774 * a + 0.2158037573 * b;
    let m_ = l - 0.1055613458 * a - 0.0638541728 * b;
    let s_ = l - 0.0894841775 * a - 1.291485548 * b;
    let l3 = l_ * l_ * l_;
    let m3 = m_ * m_ * m_;
    let s3 = s_ * s_ * s_;
    let lr = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
    let lg = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
    let lb = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;
    (lr, lg, lb)
}

pub fn oklab_to_oklch(lab: Oklab) -> Oklch {
    let c = lab.a.hypot(lab.b);
    let h = if c < 1e-6 {
        0.0
    } else {
        (lab.b.atan2(lab.a).to_degrees() + 360.0) % 360.0
    };
    Oklch { l: lab.l, c, h }
}

pub fn oklch_to_oklab(l: f64, c: f64, h: f64) -> Oklab {
    let rad = h.to_radians();
    Oklab {
        l,
        a: c * rad.cos(),
        b: c * rad.sin(),
    }
}

pub fn build_from_srgb(r: f64, g: f64, b: f64, a: f64) -> ParsedColor {
    let lr = srgb_to_linear(r / 255.0);
    let lg = srgb_to_linear(g / 255.0);
    let lb = srgb_to_linear(b / 255.0);
    let oklab = linear_srgb_to_oklab(lr, lg, lb);
    let oklch = oklab_to_oklch(oklab);
    ParsedColor {
        r: clamp_byte(r),
        g: clamp_byte(g),
        b: clamp_byte(b),
        a: clamp01(a),
        oklab,
        oklch,
    }
}

pub fn build_from_oklab(
    l: f64,
    a: f64,
    b: f64,
    alpha: f64,
    exact_oklch: Option<Oklch>,
) -> ParsedColor {
    let (lr, lg, lb) = oklab_to_linear_srgb(l, a, b);
    let r = clamp_byte(linear_to_srgb(lr) * 255.0);
    let g = clamp_byte(linear_to_srgb(lg) * 255.0);
    let bl = clamp_byte(linear_to_srgb(lb) * 255.0);
    let oklab = Oklab { l, a, b };
    let oklch = exact_oklch.unwrap_or_else(|| oklab_to_oklch(oklab));
    ParsedColor {
        r,
        g,
        b: bl,
        a: clamp01(alpha),
        oklab,
        oklch,
    }
}

fn named_color(name: &str) -> Option<(u8, u8, u8, f64)> {
    match name {
        "transparent" => Some((0, 0, 0, 0.0)),
        "black" => Some((0, 0, 0, 1.0)),
        "white" => Some((255, 255, 255, 1.0)),
        "red" => Some((255, 0, 0, 1.0)),
        "green" => Some((0, 128, 0, 1.0)),
        "lime" => Some((0, 255, 0, 1.0)),
        "blue" => Some((0, 0, 255, 1.0)),
        "yellow" => Some((255, 255, 0, 1.0)),
        "cyan" | "aqua" => Some((0, 255, 255, 1.0)),
        "magenta" | "fuchsia" => Some((255, 0, 255, 1.0)),
        "silver" => Some((192, 192, 192, 1.0)),
        "gray" | "grey" => Some((128, 128, 128, 1.0)),
        "maroon" => Some((128, 0, 0, 1.0)),
        "olive" => Some((128, 128, 0, 1.0)),
        "purple" => Some((128, 0, 128, 1.0)),
        "teal" => Some((0, 128, 128, 1.0)),
        "navy" => Some((0, 0, 128, 1.0)),
        "orange" => Some((255, 165, 0, 1.0)),
        "indigo" => Some((75, 0, 130, 1.0)),
        "violet" => Some((238, 130, 238, 1.0)),
        "pink" => Some((255, 192, 203, 1.0)),
        "rebeccapurple" => Some((102, 51, 153, 1.0)),
        "coral" => Some((255, 127, 80, 1.0)),
        "gold" => Some((255, 215, 0, 1.0)),
        "crimson" => Some((220, 20, 60, 1.0)),
        "blueviolet" => Some((138, 43, 226, 1.0)),
        "darkviolet" => Some((148, 0, 211, 1.0)),
        "darkorchid" => Some((153, 50, 204, 1.0)),
        "mediumpurple" => Some((147, 112, 219, 1.0)),
        "mediumslateblue" => Some((123, 104, 238, 1.0)),
        "slateblue" => Some((106, 90, 205, 1.0)),
        "plum" => Some((221, 160, 221, 1.0)),
        "orchid" => Some((218, 112, 214, 1.0)),
        "lavender" => Some((230, 230, 250, 1.0)),
        "tomato" => Some((255, 99, 71, 1.0)),
        "salmon" => Some((250, 128, 114, 1.0)),
        "khaki" => Some((240, 230, 140, 1.0)),
        "beige" => Some((245, 245, 220, 1.0)),
        "ivory" => Some((255, 255, 240, 1.0)),
        "linen" => Some((250, 240, 230, 1.0)),
        "snow" => Some((255, 250, 250, 1.0)),
        "whitesmoke" => Some((245, 245, 245, 1.0)),
        "gainsboro" => Some((220, 220, 220, 1.0)),
        "lightgray" | "lightgrey" => Some((211, 211, 211, 1.0)),
        "darkgray" | "darkgrey" => Some((169, 169, 169, 1.0)),
        "dimgray" | "dimgrey" => Some((105, 105, 105, 1.0)),
        "slategray" | "slategrey" => Some((112, 128, 144, 1.0)),
        "darkslategray" | "darkslategrey" => Some((47, 79, 79, 1.0)),
        "midnightblue" => Some((25, 25, 112, 1.0)),
        "royalblue" => Some((65, 105, 225, 1.0)),
        "steelblue" => Some((70, 130, 180, 1.0)),
        "dodgerblue" => Some((30, 144, 255, 1.0)),
        "deepskyblue" => Some((0, 191, 255, 1.0)),
        "skyblue" => Some((135, 206, 235, 1.0)),
        "turquoise" => Some((64, 224, 208, 1.0)),
        "seagreen" => Some((46, 139, 87, 1.0)),
        "forestgreen" => Some((34, 139, 34, 1.0)),
        "limegreen" => Some((50, 205, 50, 1.0)),
        "hotpink" => Some((255, 105, 180, 1.0)),
        "deeppink" => Some((255, 20, 147, 1.0)),
        _ => None,
    }
}

fn parse_angle(tok: &str) -> Option<f64> {
    let t = tok.trim().to_ascii_lowercase();
    if t.is_empty() {
        return None;
    }
    if t == "none" {
        return Some(0.0);
    }
    let (num_str, unit) = if let Some(s) = t.strip_suffix("deg") {
        (s, "deg")
    } else if let Some(s) = t.strip_suffix("grad") {
        (s, "grad")
    } else if let Some(s) = t.strip_suffix("rad") {
        (s, "rad")
    } else if let Some(s) = t.strip_suffix("turn") {
        (s, "turn")
    } else {
        (t.as_str(), "deg")
    };
    let v: f64 = num_str.parse().ok()?;
    if !v.is_finite() {
        return None;
    }
    let deg = match unit {
        "rad" => v.to_degrees(),
        "grad" => v * 0.9,
        "turn" => v * 360.0,
        _ => v,
    };
    Some(((deg % 360.0) + 360.0) % 360.0)
}

fn parse_alpha(tok: Option<&str>) -> Option<f64> {
    let Some(raw) = tok else {
        return Some(1.0);
    };
    let t = raw.trim().to_ascii_lowercase();
    if t.is_empty() {
        return Some(1.0);
    }
    if t == "none" {
        return Some(0.0);
    }
    if let Some(pct) = t.strip_suffix('%') {
        let n: f64 = pct.parse().ok()?;
        return if n.is_finite() {
            Some(clamp01(n / 100.0))
        } else {
            None
        };
    }
    let n: f64 = t.parse().ok()?;
    if n.is_finite() {
        Some(clamp01(n))
    } else {
        None
    }
}

fn parse_num_or_pct(tok: &str, pct_scale: f64) -> Option<f64> {
    let t = tok.trim().to_ascii_lowercase();
    if t.is_empty() {
        return None;
    }
    if t == "none" {
        return Some(0.0);
    }
    if let Some(pct) = t.strip_suffix('%') {
        let n: f64 = pct.parse().ok()?;
        return if n.is_finite() {
            Some((n / 100.0) * pct_scale)
        } else {
            None
        };
    }
    let n: f64 = t.parse().ok()?;
    if n.is_finite() {
        Some(n)
    } else {
        None
    }
}

fn split_fn_args(body: &str) -> Option<(Vec<String>, Option<String>)> {
    let (main_part, mut alpha_part) = if let Some(idx) = body.find('/') {
        let right = body[idx + 1..].trim();
        if right.is_empty() || right.contains('/') {
            return None;
        }
        (body[..idx].trim(), Some(right.to_string()))
    } else {
        (body.trim(), None)
    };

    let tokens: Vec<String> = if main_part.contains(',') {
        let mut parts: Vec<String> = main_part
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        if parts.len() == 4 && alpha_part.is_none() {
            alpha_part = Some(parts.pop().unwrap());
        }
        parts
    } else {
        main_part
            .split_whitespace()
            .map(|s| s.to_string())
            .collect()
    };

    if tokens.len() != 3 {
        return None;
    }
    Some((tokens, alpha_part))
}

fn hsl_to_rgb(h: f64, s: f64, l: f64) -> (f64, f64, f64) {
    let c = (1.0 - (2.0 * l - 1.0).abs()) * s;
    let x = c * (1.0 - ((h / 60.0) % 2.0 - 1.0).abs());
    let m = l - c / 2.0;
    let (r1, g1, b1) = if h < 60.0 {
        (c, x, 0.0)
    } else if h < 120.0 {
        (x, c, 0.0)
    } else if h < 180.0 {
        (0.0, c, x)
    } else if h < 240.0 {
        (0.0, x, c)
    } else if h < 300.0 {
        (x, 0.0, c)
    } else {
        (c, 0.0, x)
    };
    ((r1 + m) * 255.0, (g1 + m) * 255.0, (b1 + m) * 255.0)
}

/// Parse any CSS Color 4 string (hex, rgb/rgba, hsl/hsla, oklab, oklch, named).
pub fn parse_color(input: &str) -> Option<ParsedColor> {
    let s = input.trim();
    if s.is_empty() {
        return None;
    }
    let lower = s.to_ascii_lowercase();

    if let Some((r, g, b, a)) = named_color(&lower) {
        return Some(build_from_srgb(r as f64, g as f64, b as f64, a));
    }

    // Hex colors: #rgb, #rgba, #rrggbb, #rrggbbaa
    if let Some(hex) = lower.strip_prefix('#') {
        return match hex.len() {
            3 => {
                let r = u8::from_str_radix(&hex[0..1], 16).ok()? * 17;
                let g = u8::from_str_radix(&hex[1..2], 16).ok()? * 17;
                let b = u8::from_str_radix(&hex[2..3], 16).ok()? * 17;
                Some(build_from_srgb(r as f64, g as f64, b as f64, 1.0))
            }
            4 => {
                let r = u8::from_str_radix(&hex[0..1], 16).ok()? * 17;
                let g = u8::from_str_radix(&hex[1..2], 16).ok()? * 17;
                let b = u8::from_str_radix(&hex[2..3], 16).ok()? * 17;
                let a = (u8::from_str_radix(&hex[3..4], 16).ok()? * 17) as f64 / 255.0;
                Some(build_from_srgb(r as f64, g as f64, b as f64, a))
            }
            6 => {
                let r = u8::from_str_radix(&hex[0..2], 16).ok()?;
                let g = u8::from_str_radix(&hex[2..4], 16).ok()?;
                let b = u8::from_str_radix(&hex[4..6], 16).ok()?;
                Some(build_from_srgb(r as f64, g as f64, b as f64, 1.0))
            }
            8 => {
                let r = u8::from_str_radix(&hex[0..2], 16).ok()?;
                let g = u8::from_str_radix(&hex[2..4], 16).ok()?;
                let b = u8::from_str_radix(&hex[4..6], 16).ok()?;
                let a = u8::from_str_radix(&hex[6..8], 16).ok()? as f64 / 255.0;
                Some(build_from_srgb(r as f64, g as f64, b as f64, a))
            }
            _ => None,
        };
    }

    let open = lower.find('(')?;
    if !lower.ends_with(')') {
        return None;
    }
    let fn_name = lower[..open].trim();
    let body = &lower[open + 1..lower.len() - 1];

    match fn_name {
        "rgb" | "rgba" => {
            let (ch, alpha_tok) = split_fn_args(body)?;
            let r = parse_num_or_pct(&ch[0], 255.0)?;
            let g = parse_num_or_pct(&ch[1], 255.0)?;
            let b = parse_num_or_pct(&ch[2], 255.0)?;
            let a = parse_alpha(alpha_tok.as_deref())?;
            Some(build_from_srgb(r, g, b, a))
        }
        "hsl" | "hsla" => {
            let (ch, alpha_tok) = split_fn_args(body)?;
            let h = parse_angle(&ch[0])?;
            let s = parse_num_or_pct(&ch[1], 100.0)?.clamp(0.0, 100.0) / 100.0;
            let l = parse_num_or_pct(&ch[2], 100.0)?.clamp(0.0, 100.0) / 100.0;
            let a = parse_alpha(alpha_tok.as_deref())?;
            let (r, g, b) = hsl_to_rgb(h, s, l);
            Some(build_from_srgb(r, g, b, a))
        }
        "oklab" => {
            let (ch, alpha_tok) = split_fn_args(body)?;
            let l = parse_num_or_pct(&ch[0], 1.0)?.clamp(0.0, 1.0);
            let a = parse_num_or_pct(&ch[1], 0.4)?;
            let b = parse_num_or_pct(&ch[2], 0.4)?;
            let alpha = parse_alpha(alpha_tok.as_deref())?;
            Some(build_from_oklab(l, a, b, alpha, None))
        }
        "oklch" => {
            let (ch, alpha_tok) = split_fn_args(body)?;
            let l = parse_num_or_pct(&ch[0], 1.0)?.clamp(0.0, 1.0);
            let c = parse_num_or_pct(&ch[1], 0.4)?.max(0.0);
            let h = parse_angle(&ch[2])?;
            let alpha = parse_alpha(alpha_tok.as_deref())?;
            let lab = oklch_to_oklab(l, c, h);
            Some(build_from_oklab(
                lab.l,
                lab.a,
                lab.b,
                alpha,
                Some(Oklch { l, c, h }),
            ))
        }
        _ => None,
    }
}

pub fn delta_e_oklab(a: &ParsedColor, b: &ParsedColor) -> f64 {
    let dl = a.oklab.l - b.oklab.l;
    let da = a.oklab.a - b.oklab.a;
    let db = a.oklab.b - b.oklab.b;
    (dl * dl + da * da + db * db).sqrt()
}

pub fn rgb_to_hsl(c: &ParsedColor) -> Hsl {
    let r = c.r as f64 / 255.0;
    let g = c.g as f64 / 255.0;
    let b = c.b as f64 / 255.0;
    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    let l = (max + min) / 2.0;
    let (h, s) = if (max - min).abs() < f64::EPSILON {
        (0.0, 0.0)
    } else {
        let d = max - min;
        let s = if l > 0.5 {
            d / (2.0 - max - min)
        } else {
            d / (max + min)
        };
        let mut h = if (max - r).abs() < f64::EPSILON {
            (g - b) / d + if g < b { 6.0 } else { 0.0 }
        } else if (max - g).abs() < f64::EPSILON {
            (b - r) / d + 2.0
        } else {
            (r - g) / d + 4.0
        };
        h /= 6.0;
        (h * 360.0, s)
    };
    Hsl { h, s, l, a: c.a }
}

/// FIX-06: OKLCH purple window (L in [0.35, 0.80], C >= 0.10, h in [268, 310], a >= 0.25).
pub fn is_purple(c: &ParsedColor) -> bool {
    if c.a < 0.25 {
        return false;
    }
    let lch = c.oklch;
    lch.l >= 0.35 && lch.l <= 0.80 && lch.c >= 0.10 && lch.h >= 268.0 && lch.h <= 310.0
}

pub fn is_dark(c: &ParsedColor) -> bool {
    rgb_to_hsl(c).l < 0.25
}

pub fn channel_spread(c: &ParsedColor) -> u8 {
    c.r.max(c.g).max(c.b) - c.r.min(c.g).min(c.b)
}

pub fn is_neutral(c: &ParsedColor) -> bool {
    if c.a < 0.05 {
        return true;
    }
    channel_spread(c) < 30
}

pub fn relative_luminance(c: &ParsedColor) -> f64 {
    let lin = |v: u8| {
        let s = v as f64 / 255.0;
        if s <= 0.03928 {
            s / 12.92
        } else {
            ((s + 0.055) / 1.055).powf(2.4)
        }
    };
    0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b)
}

pub fn contrast_ratio(c1: &ParsedColor, c2: &ParsedColor) -> f64 {
    let l1 = relative_luminance(c1);
    let l2 = relative_luminance(c2);
    (l1.max(l2) + 0.05) / (l1.min(l2) + 0.05)
}
