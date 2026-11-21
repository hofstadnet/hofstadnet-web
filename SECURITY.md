# Security

## Reporting a security issue

Do not open a public issue. Use **Report a vulnerability** under this repository's **Security** tab, so only the
maintainers see the report. Describe what you found, how to reproduce it and what it affects. We reply as soon as we
can, but this is a personal project.

## What is in place

- All changes to `main` go through a pull request (branch ruleset «main protection»). Force push and deletion of `main`
  are blocked.
- Required checks: `dependency-review` (no dependencies with known vulnerabilities) and `workflow-security` (zizmor),
  plus CodeQL code scanning (high or higher blocks the merge).
- Actions are pinned to commit SHAs and updated monthly by Dependabot, with a 7-day cooldown.
- Workflows get read-only access by default; jobs ask for more only when they need it. `persist-credentials: false`
  on every checkout.
- Secrets live in GitHub environments limited to `main`, never in the code. `.gitignore` blocks `.env` and key files.
- Secret scanning with push protection, Dependabot alerts and security updates are on.

## This repository

- The site is published to Cloudflare Workers by Workers Builds when `main` changes. No deploy keys are stored in
  GitHub.
- The only server code is `worker/index.js`, which answers `/api/status`. It takes no input and holds no secrets.
- [`/.well-known/security.txt`](https://hofstad.net/.well-known/security.txt) points here. The build fails when it is
  within 30 days of expiring, so it gets renewed.
