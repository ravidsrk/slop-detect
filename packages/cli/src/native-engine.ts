// Native Rust engine bridge for `slop-detect` CLI.
// Discovers an installed or cached `slop-detect` native binary without adding
// any runtime dependency or breaking Playwright fallback mode.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

export interface NativeEngineInfo {
  binary: string;
  probe: string;
}

function platformAssetName(): string | null {
  const os =
    process.platform === 'darwin'
      ? 'darwin'
      : process.platform === 'linux'
        ? 'linux'
        : process.platform === 'win32'
          ? 'windows'
          : null;
  const arch = process.arch === 'arm64' ? 'arm64' : process.arch === 'x64' ? 'x64' : null;
  if (!os || !arch) return null;
  return os === 'windows' ? `slop-detect-${os}-${arch}.exe` : `slop-detect-${os}-${arch}`;
}

export function findNativeEngine(cwd = process.cwd()): NativeEngineInfo | null {
  const candidates: string[] = [];
  if (process.env.SLOP_DETECT_BIN) {
    candidates.push(process.env.SLOP_DETECT_BIN);
  }
  const exe = process.platform === 'win32' ? 'slop-detect.exe' : 'slop-detect';
  candidates.push(resolve(cwd, 'target', 'release', exe));
  candidates.push(resolve(cwd, 'target', 'debug', exe));

  const asset = platformAssetName();
  if (asset) {
    let version = '0.1.0';
    const verFile = resolve(cwd, 'ENGINE_VERSION');
    if (existsSync(verFile)) {
      try {
        version = readFileSync(verFile, 'utf8').trim() || version;
      } catch {
        // default version
      }
    }
    const cacheBase =
      process.env.XDG_CACHE_HOME ||
      (process.platform === 'win32'
        ? process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local')
        : join(homedir(), '.cache'));
    candidates.push(join(cacheBase, 'slop-detect', 'engine', version, asset));
  }

  for (const cand of candidates) {
    if (!existsSync(cand)) continue;
    try {
      const out = execFileSync(cand, ['engine-probe'], {
        encoding: 'utf8',
        timeout: 2000,
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      if (out.startsWith('slop-detect-engine')) {
        return { binary: cand, probe: out };
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

export function runNativeStaticCheck(
  binary: string,
  targetPath: string,
  opts: { designMd?: string | null; format?: string; failOn?: string } = {}
): { exitCode: number; stdout: string; stderr: string } {
  const args = ['check', targetPath];
  if (opts.designMd) args.push('--design-md', opts.designMd);
  if (opts.format) args.push('--format', opts.format);
  if (opts.failOn) args.push('--fail-on', opts.failOn);
  try {
    const stdout = execFileSync(binary, args, { encoding: 'utf8' });
    return { exitCode: 0, stdout, stderr: '' };
  } catch (err: any) {
    return {
      exitCode: typeof err?.status === 'number' ? err.status : 2,
      stdout: String(err?.stdout || ''),
      stderr: String(err?.stderr || err?.message || ''),
    };
  }
}

export function runNativeCdpScan(
  binary: string,
  url: string,
  opts: { copy?: boolean; craft?: boolean; designMd?: string | null } = {}
): Record<string, any> {
  const args = ['scan', url, '--format', 'json'];
  if (opts.copy) args.push('--copy');
  if (opts.craft) args.push('--craft');
  if (opts.designMd && opts.designMd !== 'auto' && !/^https?:\/\//i.test(opts.designMd)) {
    args.push('--design-md', opts.designMd);
  }
  const stdout = execFileSync(binary, args, {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  return JSON.parse(stdout);
}
