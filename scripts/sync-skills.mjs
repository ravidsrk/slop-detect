#!/usr/bin/env node
// Synchronizes canonical skill, plugin manifests, native binary checksums,
// and the Homebrew formula across all supported agent harnesses.
//
// Usage:
//   node scripts/sync-skills.mjs [--check]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const checkOnly = process.argv.includes('--check');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const drifts = [];
function syncFile(relTarget, expectedContent) {
  const full = path.join(ROOT, relTarget);
  const current = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
  if (current === expectedContent) return;
  if (checkOnly) {
    drifts.push(relTarget);
  } else {
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, expectedContent);
  }
}

// 1. Canonical SKILL.md -> Claude plugin copy
const canonicalSkill = read('skills/slop-detect/SKILL.md');
syncFile('plugins/slop-detect/skills/slop-detect/SKILL.md', canonicalSkill);

// 2. Canonical plugin.json -> .cursor-plugin/plugin.json
const canonicalPlugin = read('plugin.json');
syncFile('.cursor-plugin/plugin.json', canonicalPlugin);

// 3. Canonical native launchers -> plugins/slop-detect/scripts/
for (const name of ['slop-detect', 'slop-detect.cmd', 'engine-checksums.txt']) {
  syncFile(`plugins/slop-detect/scripts/${name}`, read(`skills/slop-detect/scripts/${name}`));
}

// 4. Generate Homebrew Formula/slop-detect.rb from ENGINE_VERSION + engine-checksums.txt
const engineVersion = read('ENGINE_VERSION').trim();
const checksumLines = read('skills/slop-detect/scripts/engine-checksums.txt')
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));

const sums = {};
for (const line of checksumLines) {
  const [ver, asset, sha] = line.split(/\s+/);
  if (ver === engineVersion && asset && sha) sums[asset] = sha;
}

const shaOrPlaceholder = (asset) => sums[asset] || 'PLACEHOLDER_RUN_RELEASE_ENGINE_WORKFLOW';
const base = `https://github.com/ravidsrk/slop-detect/releases/download/engine-v${engineVersion}`;

const formula = `class SlopDetect < Formula
  desc "Native zero-Node deterministic auditor for Design, Copy, DESIGN.md, Craft, and AEO"
  homepage "https://slop-detect.com"
  version "${engineVersion}"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "${base}/slop-detect-darwin-arm64"
      sha256 "${shaOrPlaceholder('slop-detect-darwin-arm64')}"
    else
      url "${base}/slop-detect-darwin-x64"
      sha256 "${shaOrPlaceholder('slop-detect-darwin-x64')}"
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "${base}/slop-detect-linux-arm64"
      sha256 "${shaOrPlaceholder('slop-detect-linux-arm64')}"
    else
      url "${base}/slop-detect-linux-x64"
      sha256 "${shaOrPlaceholder('slop-detect-linux-x64')}"
    end
  end

  def install
    bin.install Dir["slop-detect-*"].first => "slop-detect"
  end

  test do
    assert_match "slop-detect-engine #{version}", shell_output("#{bin}/slop-detect engine-probe")
  end
end
`;

syncFile('Formula/slop-detect.rb', formula);

if (checkOnly && drifts.length > 0) {
  console.error('Harness / formula drift detected:\n' + drifts.map((d) => `  - ${d}`).join('\n'));
  process.exit(1);
}

console.log(
  checkOnly
    ? 'All skill, plugin, launcher, and Homebrew artifacts are in sync.'
    : 'Synced skill, plugin, launcher, and Formula/slop-detect.rb artifacts.'
);
