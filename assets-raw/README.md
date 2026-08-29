# assets-raw

Dated evidence snapshots. **Not** the live scoring engine.

The live catalogue is `@slop-detect/core` (`DEFINITIONS_VERSION`, currently `2026.09`) and `GET /api/patterns`. Do not regenerate these files to chase the engine.

| File | What it is |
| --- | --- |
| `patterns.json` | Catalogue dump at definitions **2026.08** (`version` + 27 design patterns). |
| `scan-hn.json` | Raw scan of `https://news.ycombinator.com` under defs **2026.08**. |
| `scan-bolt.json` | Raw scan of `https://bolt.new` under defs **2026.08**. |

Kept byte-stable on purpose (see root `.prettierignore` / ESLint ignore). Scores in the scan JSON are comparable only within `2026.08`.
