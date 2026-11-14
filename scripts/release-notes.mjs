#!/usr/bin/env node
// Release notes for a tag: the body of its "## vX.Y.Z …" section in
// CHANGELOG.md, up to the next "## " heading. publish.yml writes this to the
// GitHub Release.
//
// Usage: node scripts/release-notes.mjs v0.9.1 [path/to/CHANGELOG.md]
//
// The inline regex this replaced used the m flag, so `$` matched the blank line
// under the heading and the v0.9.0 release body came out empty.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function releaseNotes(changelog, tag) {
  const lines = changelog.split('\n');
  const start = lines.findIndex((line) => line === `## ${tag}` || line.startsWith(`## ${tag} `));
  if (start === -1) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [tag, file] = process.argv.slice(2);
  if (!tag) {
    process.stderr.write('usage: node scripts/release-notes.mjs vX.Y.Z [CHANGELOG.md]\n');
    process.exit(2);
  }
  const changelog = readFileSync(file || new URL('../CHANGELOG.md', import.meta.url), 'utf8');
  process.stdout.write(`${releaseNotes(changelog, tag) || `Release ${tag}`}\n`);
}
