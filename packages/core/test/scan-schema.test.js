import { readFileSync } from 'node:fs';
import { test, expect } from 'vitest';
import Ajv from 'ajv/dist/2020.js';
import {
  assembleScanResult,
  runAeoChecks,
  stampScanResult,
  DEFINITIONS_VERSION,
} from '../src/index.ts';
import {
  assertCompatibleSchemaChange,
  breakingSchemaChanges,
} from '../../../schemas/schema-compat.mjs';

const schema = JSON.parse(
  readFileSync(new URL('../../../schemas/scan-result.v1.json', import.meta.url), 'utf8')
);
const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

function assertValid(doc, label) {
  const ok = validate(doc);
  if (!ok) {
    throw new Error(
      `${label} does not match scan-result.v1:\n` +
        ajv.errorsText(validate.errors, { separator: '\n' })
    );
  }
}

function page(extra = {}) {
  const signals = {};
  for (const id of ['purple_accent', 'slop_fonts', 'centered_hero', 'bento_grid']) {
    signals[id] = { triggered: false, note: 'present' };
  }
  return assembleScanResult(
    {
      signals,
      title: 'Acme',
      h1Text: 'Build with Acme',
      url: 'https://acme.example',
      visibleCount: 24,
      madeWith: [],
      ...extra,
    },
    { url: 'https://acme.example' }
  );
}

test('the schema is draft 2020-12 at major version 1', () => {
  expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
  expect(schema.$id).toMatch(/scan-result\.v1\.json$/);
});

test('CLI --json and POST /api/scan documents match scan-result.v1', () => {
  const cli = page();
  expect(cli.blocked).toBeFalsy();
  expect(cli.schemaVersion).toBe(1);
  expect(cli.definitionsVersion).toBe(DEFINITIONS_VERSION);
  expect(typeof cli.score).toBe('number');
  assertValid(cli, 'CLI --json');

  const api = {
    ...cli,
    calibration: 'uncalibrated-beta',
    browserVersion: 'Chrome/131.0.0.0',
    environment: { chromium: 'Chrome/131.0.0.0' },
    madeWith: null,
    navMs: 120,
  };
  assertValid(api, 'POST /api/scan');

  const withLocations = {
    ...cli,
    patterns: [
      {
        ...cli.patterns[0],
        waived: false,
        locations: [{ selector: 'h1' }],
        confidence: null,
      },
    ],
    waivedPatterns: [],
  };
  assertValid(withLocations, 'pattern locations');
  assertValid([cli, api], 'CLI --json array');
});

test('a blocked page matches the unscannable branch and is not a scored Clean', () => {
  const blocked = assembleScanResult(
    {
      signals: {},
      title: 'Just a moment...',
      url: 'https://acme.example',
      visibleCount: 0,
    },
    { url: 'https://acme.example' }
  );
  expect(blocked.blocked).toBe(true);
  expect(blocked.score).toBeNull();
  expect(blocked.code).toBe('cloudflare_challenge');
  assertValid(blocked, 'blocked scan');
});

test('POST /api/aeo and MCP structuredContent match scan-result.v1', async () => {
  const html =
    '<!doctype html><html><head><title>Acme</title></head><body><h1>Acme</h1><p>' +
    'word '.repeat(40) +
    '</p><a href="/pricing">Pricing</a></body></html>';
  const report = await runAeoChecks('https://acme.example', {
    fetchImpl: async () =>
      new Response(html, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }),
    timeoutMs: 1000,
  });
  expect(report.axis).toBe('aeo');
  expect(report.schemaVersion).toBe(1);
  assertValid(report, 'POST /api/aeo');

  const mcp = stampScanResult({ ...page(), resultUrl: 'https://slop-detect.com/r/abc' });
  assertValid(mcp, 'MCP scan_page structuredContent');
  assertValid(stampScanResult(report), 'MCP check_aeo structuredContent');
});

test('a document without schemaVersion is rejected', () => {
  const doc = page();
  delete doc.schemaVersion;
  expect(validate(doc)).toBe(false);
});

test('an incompatible schema edit fails while the major stays 1', () => {
  const added = structuredClone(schema);
  added.$defs.scoredScan.properties.optionalNote = { type: 'string' };
  expect(breakingSchemaChanges(schema, added)).toEqual([]);

  const narrowed = structuredClone(schema);
  narrowed.$defs.pattern.properties.status.enum = ['fail', 'pass'];
  expect(() => assertCompatibleSchemaChange(schema, narrowed)).toThrow(/major-version bump/);

  narrowed.$id = 'https://slop-detect.com/schemas/scan-result.v2.json';
  expect(() => assertCompatibleSchemaChange(schema, narrowed)).not.toThrow();
});

test('narrowing a nested anyOf is a break while the major stays 1', () => {
  const previous = {
    $id: 'https://slop-detect.com/schemas/scan-result.v1.json',
    properties: {
      status: { anyOf: [{ enum: ['pass', 'fail', 'unknown'] }, { type: 'null' }] },
    },
  };
  const next = {
    $id: 'https://slop-detect.com/schemas/scan-result.v1.json',
    properties: {
      status: { anyOf: [{ enum: ['pass', 'fail'] }, { type: 'null' }] },
    },
  };
  expect(() => assertCompatibleSchemaChange(previous, next)).toThrow(/enum lost/);

  const added = {
    $id: 'https://slop-detect.com/schemas/scan-result.v1.json',
    anyOf: [{ type: 'object' }],
  };
  expect(breakingSchemaChanges({ type: 'object' }, added).join('\n')).toMatch(/anyOf added/);
});

test('the MCP package schema matches schemas/scan-result.v1.json', () => {
  const packaged = readFileSync(
    new URL('../../../packages/mcp/schema/scan-result.v1.json', import.meta.url),
    'utf8'
  );
  expect(JSON.parse(packaged)).toEqual(schema);
});
