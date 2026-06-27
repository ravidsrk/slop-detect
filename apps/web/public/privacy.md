# Slop Detector — Privacy Policy

_Last updated: 2026-06-28 · Policy version: 2026.06_

Slop Detector is an open-source project. We collect as little as possible and we
never sell data. This page is the plain-language record of what is stored, why,
and how to remove it.

## What we store

| Data | When | Why | Retention |
| --- | --- | --- | --- |
| **Scanned URL + scan result** (score, triggered patterns, title/H1) | Every scan you run on the web/API | To render the result, the shareable permalink, and the per-domain badge | ~90 days (KV TTL) |
| **Your email address** | Only if you start **monitoring** a domain (`POST /api/watch`) or request a dashboard sign-in link (`POST /api/dashboard/link`) | To send regression alerts ("your score dropped") and the sign-in link you asked for. We store it hashed (SHA-256) in the lookup index. | Until you unsubscribe; otherwise up to 1 year |
| **Dashboard sign-in session** (`sd_session` cookie) | Only after you click an emailed sign-in link | To keep you signed in to the agency dashboard. It is a single HttpOnly, Secure, SameSite=Lax cookie holding a signed token, not an advertising/tracking ID. | 30 days, or until you sign out |
| **Sign-in / confirmation link tokens** | When you request a dashboard link or start monitoring | Single-use tokens that verify the emailed link | 15 minutes (sign-in) / 7 days (monitoring confirmation) |
| **Per-IP and per-email rate-limit counters** | Every API request / email send | Abuse, cost, and inbox-spam protection | 60 seconds to 1 hour |

We do **not** store full page content, screenshots (unless you explicitly request
one in a scan, and even then it is not persisted to the directory), advertising or
cross-site tracking identifiers, or behavioural profiles. The only cookie we set
is the functional `sd_session` sign-in cookie described above, and only after you
deliberately sign in to the dashboard. We do not use third-party analytics that
profile you.

## Third parties (sub-processors)

To run the service we rely on a few providers. Visiting the site necessarily
shares your IP address with them, the same way loading any website does:

| Provider | Role | What it receives |
| --- | --- | --- |
| **Cloudflare** | Hosting, the headless-scan browser, and the Turnstile anti-abuse challenge | Request metadata including your IP; Turnstile runs on the scan form to block bots |
| **Google Fonts** | Serves the web fonts used by the site | Your IP and user-agent when your browser fetches the font files |
| **Resend** | Sends the monitoring and sign-in emails | The recipient address and message, only when an email is actually sent |

None of these are used for advertising. If you would rather not share anything
with Google or Cloudflare, self-host (see below); the fonts and challenge are the
only third-party assets the pages load.

## Lawful basis & consent

Your email is stored **only** because you submitted it to opt into monitoring —
that is your consent. We record the time of consent (`consentAt`) and this policy
version with the record. We use **double opt-in**: we will not send a single
alert until you click the confirmation link we email you (which sets your record
to `verified`). If you never confirm, you never receive email. We will never use
your address for anything other than the regression alerts you asked for, and we
will never sell or share it.

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
