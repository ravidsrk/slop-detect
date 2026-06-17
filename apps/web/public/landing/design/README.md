# Landing design assets (new editorial-instrument identity)

Extracted from the Claude Design export `slop-detect-branding-project`
(Landing / Result / Leaderboard / Docs / Brand). Full spec, tokens, and
screen inventory: `docs/design-extract.md` at the repo root.

| File             | Use                                                                 |
|------------------|---------------------------------------------------------------------|
| `mark.svg`       | Scan-reticle mark for light surfaces. Ink brackets, `#1FA85E` dot.  |
| `mark-dark.svg`  | Same mark for dark surfaces (`#16170F`). Paper brackets, `#3FBE7A`. |
| `favicon.svg`    | Reticle in a rounded paper tile. Replaces the old dark favicon.     |

Notes for the builder:

- The mark is the only custom vector in the system. Everything else (carets,
  checks, crosses, arrows, the continuity glyphs `↻ ◳ ⎙ ⊘ ↗`) is a Unicode
  text glyph, not an icon font. Keep it that way: an icon library would itself
  trip the slop detector.
- The wordmark is not a vector file. It is the mark plus the literal string
  `slop-detect` set in JetBrains Mono, 700, letter-spacing `-0.01em`, always
  lowercase and hyphenated. Render it as inline SVG + a styled span, the way
  the export does, so it stays crisp and selectable.
- Fonts are loaded from Google Fonts (Newsreader, Libre Franklin, JetBrains
  Mono) in the export, so there are no font binaries to commit here. The repo
  already ships `landing/fonts/*.woff2` for the OLD identity (Hanken / Martian);
  those belong to the current `_brand.ts` theme and are not part of this design.
- The two PNGs in the export's `uploads/` folder are screenshots of a
  third-party reference product, not slop-detect assets. They are intentionally
  NOT committed.
