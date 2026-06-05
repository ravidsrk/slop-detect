# Slop Detector — Privacy Policy

_Last updated: 2026-06-05 · Policy version: 2026.06_

Slop Detector is an open-source project. We collect as little as possible and we
never sell data. This page is the plain-language record of what is stored, why,
and how to remove it.

## What we store

| Data | When | Why | Retention |
| --- | --- | --- | --- |
| **Scanned URL + scan result** (score, triggered patterns, title/H1) | Every scan you run on the web/API | To render the result, the shareable permalink, and the per-domain badge | ~90 days (KV TTL) |
| **Your email address** | Only if you start **monitoring** a domain (`POST /api/watch`) | To send regression alerts ("your score dropped") for that domain | Until you unsubscribe; otherwise up to 1 year |
| **Per-IP rate-limit counters** | Every API request | Abuse / cost protection | 60 seconds |

We do **not** store full page content, screenshots (unless you explicitly request
one in a scan, and even then it is not persisted to the directory), cookies, or
any advertising/tracking identifiers. We do not use third-party analytics that
profile you.

## Lawful basis & consent

Your email is stored **only** because you submitted it to opt into monitoring —
that is your consent. We record the time of consent (`consentAt`) and this policy
version with the record. **Regression alert emails are not active yet** during the
validation phase, and we will not email an address until it has been confirmed
via a double-opt-in step (planned). We will never use your email for anything
other than the alerts you asked for, and we will never sell or share it.

## The public directory

Domains appear in the public [directory](/directory) **only** if their owner
explicitly opts in (`POST /api/watch` with `list: true`). Scanning a site does
**not** list it. A listing shows the domain, its slop score, and a link to the
site — no email is ever shown. You can delist at any time (see below).

## How to delete your data

- **Stop monitoring & delist a domain, and remove your email:**
  `POST /api/watch` with `{ "domain": "<your-domain>", "email": "<your-email>", "unsubscribe": true }`.
  The email must match the one used to subscribe.
- **Remove a stored scan result / badge / directory entry, or anything else:**
  email the maintainer at the address in the repo, or open an issue at
  <https://github.com/ravidsrk/slop-detect/issues>, and we will delete it.

## Self-hosting

The entire stack is MIT-licensed. If you would rather no data touch our
infrastructure at all, run the CLI locally (`npx slop-detect <url>`, which only
fetches the page you point it at) or self-host the web app on your own Cloudflare
account.

## Contact

Open an issue at <https://github.com/ravidsrk/slop-detect/issues> or contact the
maintainer listed in the repository.
