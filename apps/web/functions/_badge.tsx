/** @jsxRuntime automatic @jsxImportSource hono/jsx */
// Self-rendered embeddable badge SVG — no shields.io dependency.
//
// The two-segment editorial pill from design "Components > Live badge" + the
// "Tier, grade, and verdict logic > Badge colors" table: a dark left segment
// ("slop") and a tier-colored right segment ("grade · score"). Right-segment
// colors come from the centralized resolver in _theme.ts so the badge, OG card,
// and pages all read one source of truth.
//
// Relocated here from _render.tsx by foundation task 00; restyled to the new
// editorial system by task 12. The old shields-style linear-gradient overlay is
// dropped — a gradient is a slop tell, so the badge now passes its own detector.

import { badgeColors } from './_theme.js';

export function badgeSvg(domain, slim) {
  const label = 'slop';
  const value = slim ? `${slim.grade} · ${slim.score}` : 'no scan';
  // Right segment: tier bg + ink from the badge-colors table; the neutral grey
  // default (badgeColors('Unknown')) carries the "no scan" state.
  const { bg, ink } = badgeColors(slim ? slim.tier : 'Unknown');

  // JetBrains Mono geometry. The face advances ≈ 0.6em, so ~7.25px per glyph at
  // 12px; each segment gets 8px of horizontal breathing room on each side.
  const fontSize = 12;
  const charW = 7.25;
  const padX = 8;
  const height = 22;
  const radius = 4; // design "Radii": 4px badge corners.

  const leftW = Math.round(label.length * charW) + padX * 2;
  const rightW = Math.round(value.length * charW) + padX * 2;
  const pillW = leftW + rightW;

  // The badge is the one surface the system allows a shadow (design "Shadows":
  // 0 1px 2px rgba(0,0,0,0.1)). feDropShadow bleeds ~3px down and ~2px sideways,
  // so the pill is inset inside a slightly larger canvas to avoid clipping it.
  const mx = 2;
  const mTop = 1;
  const mBottom = 3;
  const w = pillW + mx * 2;
  const h = height + mTop + mBottom;
  const baseline = mTop + Math.round(height / 2 + fontSize * 0.355);
  const name = domain ? `slop score for ${domain}: ${value}` : `slop: ${value}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={name}
    >
      <title>{name}</title>
      <defs>
        <clipPath id="r">
          <rect x={mx} y={mTop} width={pillW} height={height} rx={radius} />
        </clipPath>
        <filter id="sh" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000000" flood-opacity="0.1" />
        </filter>
      </defs>
      <g filter="url(#sh)">
        <g clip-path="url(#r)">
          <rect x={mx} y={mTop} width={leftW} height={height} fill="#16170F" />
          <rect x={mx + leftW} y={mTop} width={rightW} height={height} fill={bg} />
        </g>
      </g>
      <g
        font-family="'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace"
        font-size={fontSize}
        font-weight="700"
        text-anchor="middle"
      >
        <text x={mx + leftW / 2} y={baseline} fill="#F4F5F2">
          {label}
        </text>
        <text x={mx + leftW + rightW / 2} y={baseline} fill={ink}>
          {value}
        </text>
      </g>
    </svg>
  ).toString();
}
