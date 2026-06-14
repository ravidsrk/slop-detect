export default function ScoringPage() {
  return (
    <article>
      <h1 className="mb-6 text-3xl font-bold">Design slop scoring</h1>
      <p className="mb-4 text-[var(--muted)]">
        Slop-detect scores landing pages against a deterministic, weighted 0–100
        fingerprint built from CSS and copy tells that AI page builders tend to
        converge on. The catalogue covers 27 patterns — things like Inter-style
        font stacks, gradient-heavy heroes, glassmorphism, and generic centered
        layouts — each checked on real headless Chromium.
      </p>
      <p className="text-[var(--muted)]">
        Scores roll up into tiers: Clean (0–9), Mild (10–27), and Heavy (28+).
        The same engine powers the CLI, the web UI, and the HTTP API, so a Heavy
        from one surface is a Heavy from all of them.
      </p>
    </article>
  );
}