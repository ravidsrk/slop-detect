// Shared brand identity for server-rendered pages (/directory, /leaderboard,
// /report/:domain) so they read as the SAME product as the landing page: the
// forensic-instrument register — Hanken Grotesk prose, Martian Mono readouts,
// cold-blue accent, blue-tinted neutrals, §-registration marks. One source of
// truth; pages interpolate these constants instead of hand-rolling tokens.
// Anti-slop by construction, like everything else here.

export const BRAND_FONTS_HEAD = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=Martian+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">`;

export const BRAND_CSS = `
  :root{
    color-scheme:dark;
    --bg:#0a0b0e; --bg-2:#0e1014; --panel:#131620; --panel-2:#1a1e2a;
    --border:#262b38; --border-2:#353c4d;
    --text:#f2f4f8; --text-2:#c2c7d2; --muted:#9aa1b1; --dim:#6f7689;
    --accent:#5b9dff; --accent-soft:rgba(91,157,255,0.10); --accent-ink:#06080d;
    --green:#4ade80; --yellow:#fbbf24; --red:#f87171;
    --sans:"Hanken Grotesk",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    --mono:"Martian Mono",ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:var(--bg);color:var(--text);font-family:var(--sans);line-height:1.55}
  a{color:inherit}
  .eyebrow{display:flex;align-items:center;gap:10px;margin-bottom:10px}
  .eyebrow .reg{
    font-family:var(--mono);font-size:11px;font-weight:600;color:var(--accent);
    border:1px solid var(--border-2);background:var(--accent-soft);
    border-radius:5px;padding:3px 7px;letter-spacing:-0.04em;
  }
  .eyebrow .reg-label{
    font-family:var(--mono);font-size:11.5px;color:var(--dim);
    text-transform:uppercase;letter-spacing:0.04em;
  }`;
