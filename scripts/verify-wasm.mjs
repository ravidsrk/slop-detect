#!/usr/bin/env node
// Verifies the compiled `slop_wasm.wasm` binary directly via Node/WebAssembly
// (zero wasm-pack glue required) against spec/oracle/vectors.json.

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const wasmPath = path.join(ROOT, 'target/wasm32-unknown-unknown/release/slop_wasm.wasm');
const oracle = JSON.parse(fs.readFileSync(path.join(ROOT, 'spec/oracle/vectors.json'), 'utf8'));

const wasmBytes = fs.readFileSync(wasmPath);
const { instance } = await WebAssembly.instantiate(wasmBytes, {});
const { memory, slop_alloc, slop_dealloc, slop_call } = instance.exports;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function callWasm(op, payload) {
  const opBytes = encoder.encode(op);
  const payloadBytes = encoder.encode(payload);
  const opPtr = slop_alloc(opBytes.length);
  const payloadPtr = slop_alloc(payloadBytes.length);
  new Uint8Array(memory.buffer, opPtr, opBytes.length).set(opBytes);
  new Uint8Array(memory.buffer, payloadPtr, payloadBytes.length).set(payloadBytes);

  const packed = slop_call(opPtr, opBytes.length, payloadPtr, payloadBytes.length);
  slop_dealloc(opPtr, opBytes.length);
  slop_dealloc(payloadPtr, payloadBytes.length);

  const outPtr = Number(packed >> 32n);
  const outLen = Number(packed & 0xffffffffn);
  const text = decoder.decode(new Uint8Array(memory.buffer, outPtr, outLen));
  slop_dealloc(outPtr, outLen);
  return JSON.parse(text);
}

const ver = callWasm('version', '');
assert.equal(ver.definitionsVersion, oracle.definitionsVersion);

const col = callWasm('parse_color', '#1FA85E');
assert.equal(col.r, 31);
assert.equal(col.g, 168);
assert.equal(col.b, 94);

const lintValid = callWasm('lint_design_md', oracle.designMd.fixtures.validDesignMd);
assert.equal(lintValid.valid, true);

const lintBroken = callWasm('lint_design_md', oracle.designMd.fixtures.brokenDesignMd);
assert.equal(lintBroken.valid, false);
assert.equal(lintBroken.errors.length, oracle.designMd.lintBroken.errors.length);

const scoreHeavy = callWasm(
  'score_patterns',
  JSON.stringify(oracle.designScore.find((c) => c.name === 'heavy_vibecode_stack').input)
);
assert.equal(scoreHeavy.score, 32);
assert.equal(scoreHeavy.tier, 'Heavy');
assert.equal(scoreHeavy.grade, 'D+');

const copyArtifacts = callWasm(
  'score_copy',
  JSON.stringify(oracle.copy.find((c) => c.name === 'paste_artifacts').input)
);
assert.ok(copyArtifacts.triggeredIds.includes('chatbot_markup_leak'));
assert.ok(copyArtifacts.triggeredIds.includes('ai_referral_utm_links'));

const robotsCf = callWasm(
  'evaluate_robots',
  JSON.stringify({
    robotsTxt: '# BEGIN Cloudflare Managed content\nUser-agent: *\nDisallow: /\n',
    pathname: '/',
    status: 200,
    contentType: 'text/plain',
  })
);
assert.equal(robotsCf.cloudflareManaged, true);
assert.equal(robotsCf.searchAllowed, false);

console.log(
  `WASM parity PASSED (${(wasmBytes.length / 1024).toFixed(1)} KB wasm, definitions=${ver.definitionsVersion}, engine=${ver.engineVersion})`
);
