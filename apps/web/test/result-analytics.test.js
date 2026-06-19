// Competitive analytics composites: rank-average radar overlay + category neighbors.
// Rendered to strings — no browser.

import { test, expect } from 'vitest';
import { Analytics, buildResultView } from '../functions/_result.tsx';

const r = (node) => node.toString();

const slim = {
  domain: 'ex.com',
  score: 30,
  tier: 'Heavy',
  grade: 'D',
  triggered: [{ id: 'slop_fonts', label: 'AI-default font stack', short: 'Slop fonts', weight: 8 }],
};

const categories = buildResultView(slim).categories;

test('radar draws rank-average polygon + legend only when catAvg present and count >= 5', () => {
  const withAvg = r(
    Analytics({
      slim,
      categories,
      catAvg: categories.map((c) => c.cleanFraction * 0.8),
      catAvgCount: 5,
    })
  );
  expect(withAvg).toMatch(/stroke-dasharray="3 3"/);
  expect(withAvg).toMatch(/--- rank avg/);
  expect(withAvg).toMatch(/— you/);

  const lowCount = r(
    Analytics({ slim, categories, catAvg: categories.map((c) => 0.5), catAvgCount: 4 })
  );
  expect(lowCount).not.toMatch(/--- rank avg/);
  expect(lowCount).not.toMatch(/stroke-dasharray="3 3"/);

  const noAvg = r(Analytics({ slim, categories }));
  expect(noAvg).not.toMatch(/--- rank avg/);
});

test('neighbors tile renders siblings, marks you, and links to /score', () => {
  const html = r(
    Analytics({
      slim,
      categories,
      origin: 'https://slop-detect.com',
      neighbors: {
        categoryLabel: 'SaaS & dev tools',
        rows: [
          {
            rank: 1,
            name: 'Stripe',
            domain: 'stripe.com',
            score: 4,
            grade: 'A',
            tier: 'Clean',
            you: false,
          },
          {
            rank: 2,
            name: 'Ex',
            domain: 'ex.com',
            score: 30,
            grade: 'D',
            tier: 'Heavy',
            you: true,
          },
        ],
      },
    })
  );
  expect(html).toMatch(/SaaS &amp; dev tools neighbors/);
  expect(html).toMatch(/href="https:\/\/slop-detect\.com\/score\/stripe\.com"/);
  expect(html).toMatch(/href="https:\/\/slop-detect\.com\/score\/ex\.com"/);
  expect(html).toMatch(/nb-you/);
  expect(html).toMatch(/#2/);
});

test('neighbors tile omitted when data absent', () => {
  const html = r(Analytics({ slim, categories, origin: 'https://slop-detect.com' }));
  expect(html).not.toMatch(/class="nb-row/);
  expect(html).not.toMatch(/ neighbors<\/div>/);
});
