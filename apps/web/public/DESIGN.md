---
name: "slop-detect.com"
colors:
  surface: "#F4F5F2"
  surfaceRecessed: "#EEF0EB"
  panel: "#FBFBF9"
  darkSurface: "#16170F"
  darkDeep: "#0F0F0B"
  ink: "#181815"
  inkSecondary: "#3A3B33"
  inkMuted: "#565750"
  clean: "#1FA85E"
  cleanText: "#0E6B3A"
  cleanDark: "#3FBE7A"
  mild: "#D89A2E"
  mildText: "#78520A"
  heavy: "#C9402E"
  heavyText: "#A83223"
  systemBlueprint: "#2C6E8F"
  border: "#DBDDD6"
typography:
  display: "Newsreader"
  body: "Libre Franklin"
  mono: "JetBrains Mono"
rounded:
  xs: "2px"
  sm: "3px"
  md: "4px"
  card: "6px"
  lg: "8px"
  xl: "10px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section: "64px"
---

# Design System — slop-detect.com

Editorial-instrument design system for Slop Detector (`https://slop-detect.com`). Built as a deliberate counter-specimen to AI page-builder defaults: cool archival paper, carbon ink ledger rules, optical serif display typography, and calibrated verdict hues.

## 1. Visual Theme & Atmosphere

Dieter Rams industrial manual meets a Swiss typographic print plate. High-contrast carbon ink on cool archival paper (`#F4F5F2`), flat 1px structural borders (`#DBDDD6`), and a 1.5px solid ink section ledger (`#181815`) as the primary hierarchy divider. Dark continuity sections use deep carbon (`#16170F` and `#0F0F0B`).

## 2. Color Palette & Roles

- **Primary Paper Surface**: `#F4F5F2`
- **Secondary Recessed Surface**: `#EEF0EB`
- **Elevated Panel Surface**: `#FBFBF9`
- **Dark Instrument Surface**: `#16170F` and `#0F0F0B`
- **Primary Ink**: `#181815`
- **Secondary & Muted Ink**: `#3A3B33`, `#46473F`, `#565750`, `#595A52`
- **Primary Calibration Accent (Clean)**: `#1FA85E`, `#0E6B3A`, `#3FBE7A`
- **Warning Verdict Accent (Mild)**: `#D89A2E`, `#78520A`
- **Alert Verdict Accent (Heavy)**: `#C9402E`, `#A83223`
- **System Blueprint Accent**: `#2C6E8F`, `#1F5E7D`

## 3. Typography Rules

- **Display / Headline**: `Newsreader`, optical size 6..72, weight 500, tight editorial tracking (`-0.02em` to `-0.03em`).
- **Body / UI Sans**: `Libre Franklin`, weights 400, 500, 600, 700, comfortable `1.6` line-height.
- **Data / Telemetry / Code Mono**: `JetBrains Mono`, weights 400, 500, 700, `tabular-nums` enabled on all scores and counters.

## 4. Component Stylings

- **Corner Radius Scale**: `2px`, `3px`, `4px`, `5px`, `6px`, `8px`, `10px`, and `999px` for status pills.
- **Buttons & Inputs**: Flat ink (`#181815`) or calibration green (`#1FA85E`) fills with crisp `3px` or `4px` corners.
- **Cards & Ledgers**: Flat `1px solid #DBDDD6` panels on `#FBFBF9` with `6px`, `8px`, or `10px` corners.

## 5. Do's and Don'ts

- Do not use `gradient_text` (`background-clip: text` gradients on headings).
- Do not use `purple_accent` (purple, indigo, or violet CTAs and accents).
- Do not use `glass_card` (`backdrop-filter: blur` glassmorphism cards).
- Do not use `glow_shadow` (ambient colored neon `box-shadow` glows).
