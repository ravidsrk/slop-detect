// Universal zero-dependency WebAssembly bridge for `crates/slop-wasm` (`slop_wasm.wasm`).
// Works identically in Node 20+, Bun, browsers, and Cloudflare Workers.

export interface SlopWasmExports {
  memory: WebAssembly.Memory;
  slop_alloc: (len: number) => number;
  slop_dealloc: (ptr: number, len: number) => void;
  slop_call: (opPtr: number, opLen: number, payloadPtr: number, payloadLen: number) => bigint;
}

export interface SlopWasmEngine {
  call<T = any>(op: string, payload?: string | Record<string, unknown> | unknown[]): T;
  version(): { engineVersion: string; definitionsVersion: string };
  parseColor(input: string): Record<string, any> | null;
  lintDesignMd(text: string): Record<string, any>;
  diffDesignMd(base: string, head: string): Record<string, any>;
  scorePatterns(patterns: unknown[]): Record<string, any>;
  scoreCopy(input: Record<string, unknown>): Record<string, any>;
  scoreSystem(designMd: string, observed: Record<string, unknown>): Record<string, any>;
  evaluateRobots(input: {
    robotsTxt: string;
    pathname?: string;
    status?: number;
    contentType?: string;
  }): Record<string, any>;
  parsePreview(headers: Record<string, string>, html: string): Record<string, any>;
  validateLlms(body: string, contentType?: string): Record<string, any>;
  fixPrompt(opts: {
    url?: string;
    score?: number;
    tier?: string;
    patterns?: string[];
    brief?: boolean;
  }): Record<string, any>;
  extractDesignSystem(
    observed: Record<string, unknown>,
    opts?: { name?: string; url?: string }
  ): { designMd: string; dtcg: Record<string, any> };
}

/** Instantiate `slop_wasm.wasm` from bytes or a pre-compiled `WebAssembly.Module` (e.g. Cloudflare Workers). */
export async function loadSlopWasm(
  source: BufferSource | WebAssembly.Module
): Promise<SlopWasmEngine> {
  const instantiated =
    source instanceof WebAssembly.Module
      ? await WebAssembly.instantiate(source, {})
      : (await WebAssembly.instantiate(source, {})).instance;
  const exports = instantiated.exports as unknown as SlopWasmExports;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  function call<T = any>(
    op: string,
    payload: string | Record<string, unknown> | unknown[] = ''
  ): T {
    const rawPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const opBytes = encoder.encode(op);
    const payloadBytes = encoder.encode(rawPayload);
    const opPtr = exports.slop_alloc(opBytes.length);
    const payloadPtr = exports.slop_alloc(payloadBytes.length);
    try {
      if (opBytes.length > 0) {
        new Uint8Array(exports.memory.buffer, opPtr, opBytes.length).set(opBytes);
      }
      if (payloadBytes.length > 0) {
        new Uint8Array(exports.memory.buffer, payloadPtr, payloadBytes.length).set(payloadBytes);
      }
      const packed = exports.slop_call(opPtr, opBytes.length, payloadPtr, payloadBytes.length);
      const outPtr = Number(packed >> 32n);
      const outLen = Number(packed & 0xffffffffn);
      const outStr = decoder.decode(new Uint8Array(exports.memory.buffer, outPtr, outLen));
      exports.slop_dealloc(outPtr, outLen);
      return JSON.parse(outStr) as T;
    } finally {
      exports.slop_dealloc(opPtr, opBytes.length);
      exports.slop_dealloc(payloadPtr, payloadBytes.length);
    }
  }

  return {
    call,
    version: () => call('version', ''),
    parseColor: (input) => call('parse_color', input),
    lintDesignMd: (text) => call('lint_design_md', text),
    diffDesignMd: (base, head) => call('diff_design_md', { base, head }),
    scorePatterns: (patterns) => call('score_patterns', patterns),
    scoreCopy: (input) => call('score_copy', input),
    scoreSystem: (designMd, observed) => call('score_system', { designMd, observed }),
    evaluateRobots: (input) => call('evaluate_robots', input),
    parsePreview: (headers, html) => call('parse_preview', { headers, html }),
    validateLlms: (body, contentType = 'text/plain') =>
      call('validate_llms', { body, contentType }),
    fixPrompt: (opts) => call('fix_prompt', opts),
    extractDesignSystem: (observed, opts = {}) =>
      call('extract_design_system', { observed, ...opts }),
  };
}
