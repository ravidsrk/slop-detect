#!/usr/bin/env bun
// Owner-run post-verify check (H-03 / T-37): `bun scripts/email-auth-check.ts [domain]`.
// Exit 0 when SPF + DKIM + DMARC all resolve correctly, 1 otherwise.

import { promises as dns } from 'node:dns';
import { checkEmailAuth, formatReport } from '../apps/web/functions/_emailauth.ts';

const domain = process.argv[2] || 'slop-detect.com';
const report = await checkEmailAuth(domain, (name) => dns.resolveTxt(name));
console.log(formatReport(report));
process.exit(report.ok ? 0 : 1);
