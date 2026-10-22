// Deterministic AEO starter files (W-04). No model writes these.
// The training list is the installed engine registry, not a live download.
// Search crawlers are not given their own Allow lines.

import { AI_BOT_REGISTRY } from './aeo.js';

export interface AeoFixPage {
  title: string;
  url: string;
}

export interface AeoFixOptions {
  origin?: string;
  siteName?: string;
  pages?: AeoFixPage[];
}

function cleanOrigin(raw: string | undefined): string {
  const value = (raw || 'https://example.com').trim();
  const url = new URL(value);
  url.hash = '';
  url.search = '';
  url.pathname = '';
  return url.toString().replace(/\/$/, '');
}

export function buildAeoFixFiles(opts: AeoFixOptions = {}): Record<string, string> {
  const origin = cleanOrigin(opts.origin);
  const siteName = (opts.siteName || 'Site').replace(/[\r\n#]/g, ' ').trim() || 'Site';
  const pages =
    opts.pages && opts.pages.length ? opts.pages : [{ title: 'Home', url: `${origin}/` }];

  const training = AI_BOT_REGISTRY.filter((bot) => bot.purpose === 'training' && !bot.legacy)
    .map((bot) => bot.name)
    .sort((a, b) => a.localeCompare(b));

  const robots = [
    '# Starter robots.txt from the installed slop-detect engine registry.',
    '# Not a live mirror of ai.robots.txt. Search crawlers have no per-bot Allow lines.',
    '# Training crawlers are disallowed as one group.',
    '',
    ...training.map((name) => `User-agent: ${name}`),
    'Disallow: /',
    '',
    'User-agent: *',
    'Allow: /',
    '',
    `Agentmap: ${origin}/.well-known/agentmap.json`,
    '',
  ].join('\n');

  const linkLines = pages.map((page) => {
    const title =
      String(page.title || page.url)
        .replaceAll('[', '')
        .replaceAll(']', '')
        .trim() || 'Page';
    return `- [${title}](${page.url}): ${title}`;
  });
  const llms = [
    `# ${siteName}`,
    '',
    '> Draft index of the pages you named. No model wrote this file.',
    '',
    ...linkLines,
    '',
  ].join('\n');

  const ard = {
    schemaVersion: '0.1',
    name: siteName,
    origin,
    description:
      'Starter agent discovery record. Fill this in before publishing. It is not a completed agent card.',
    endpoints: [] as string[],
  };

  const linkHeaders = [
    '# Link header snippets. Vary: Accept is omitted because this starter does not negotiate a markdown twin.',
    'Link: </llms.txt>; rel="describedby"; type="text/plain"',
    `Link: <${origin}/.well-known/ard.json>; rel="describedby"; type="application/json"`,
    '',
  ].join('\n');

  return {
    'robots.txt': robots,
    'llms.txt': llms,
    'ard.json': `${JSON.stringify(ard, null, 2)}\n`,
    'link-headers.txt': linkHeaders,
  };
}
