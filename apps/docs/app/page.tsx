import Link from 'next/link';

const sections = [
  {
    href: '/scoring',
    title: 'Scoring',
    description: 'The 27-pattern design slop catalogue and how pages are tiered.',
  },
  {
    href: '/aeo',
    title: 'AEO',
    description: 'Whether AI engines can fetch, read, and cite your page.',
  },
  {
    href: '/cli',
    title: 'CLI',
    description: 'Run scans from the terminal or wire them into CI.',
  },
];

export default function HomePage() {
  return (
    <div>
      <h1 className="mb-3 text-3xl font-bold">slop-detect</h1>
      <p className="mb-10 text-[var(--muted)]">
        Score any landing page against the AI-design-slop fingerprint.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="block border border-[var(--border)] p-4 hover:border-[var(--accent)]"
          >
            <h2 className="mb-2 text-lg font-bold">{section.title}</h2>
            <p className="text-sm text-[var(--muted)]">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
