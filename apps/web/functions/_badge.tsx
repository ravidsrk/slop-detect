/** @jsxRuntime automatic @jsxImportSource hono/jsx */
// Self-rendered badge SVG (shields-style, so we don't depend on shields.io).
//
// Relocated here from _render.tsx by foundation task 00. The visual treatment is
// untouched — the new two-segment editorial badge is task 12's job. Tier colors
// come from the centralized resolver in _theme.ts.

import { tierColors } from './_theme.js';

export function badgeSvg(domain, slim) {
  const label = 'slop';
  const score = slim ? slim.score : '?';
  const grade = slim ? slim.grade : '—';
  const tier = slim ? slim.tier : 'Unknown';
  const c = tierColors(tier);

  const value = slim ? `${grade} · ${score}` : 'no scan';
  // Rough text-width estimate (monospace-ish, 6.6px/char + padding).
  const labelW = 38;
  const valueW = Math.max(46, value.length * 6.8 + 16);
  const total = labelW + valueW;
  const fill = slim ? c.fg : '#8a8a92';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={total}
      height="20"
      role="img"
      aria-label={`${label}: ${value}`}
    >
      <linearGradient id="s" x2="0" y2="100%">
        <stop offset="0" stop-color="#bbb" stop-opacity=".1" />
        <stop offset="1" stop-opacity=".1" />
      </linearGradient>
      <clipPath id="r">
        <rect width={total} height="20" rx="3" fill="#fff" />
      </clipPath>
      <g clip-path="url(#r)">
        <rect width={labelW} height="20" fill="#1a1a1d" />
        <rect x={labelW} width={valueW} height="20" fill={fill} />
        <rect width={total} height="20" fill="url(#s)" />
      </g>
      <g text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
        <text x={labelW / 2} y="14" fill="#fff">
          {label}
        </text>
        <text x={labelW + valueW / 2} y="14" fill="#0a0a0b" font-weight="bold">
          {value}
        </text>
      </g>
    </svg>
  ).toString();
}
