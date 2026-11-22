# Security

## Reporting a security issue

Do not open a public issue. Use **Report a vulnerability** under this repository's **Security** tab, so only the
maintainers see the report. Describe what you found, how to reproduce it and what it affects. This is a personal
project, so replies may take a few days.

## Scope

- The site at https://hofstad.net and the code in this repository.
- The Worker endpoints `GET /api/status` and `POST /api/csp`.
- The Cloudflare configuration in `infra/`.

Reports about missing headers that are intentionally absent, rate limiting thresholds or the public DNS records are
generally out of scope, unless they lead to a concrete attack.

## What is in place

- All changes to `main` go through a pull request. Required checks: `build`, `dependency-review` and
  `workflow-security` (zizmor). CodeQL findings of high severity or above block the merge. Force push and deletion
  of `main` are blocked.
- Actions are pinned to commit SHAs. npm packages are installed from the lockfile with install scripts disabled, and
  the build fails if a package lacks a valid registry signature.
- Dependabot proposes updates monthly with a 7-day cooldown.
- Workflows get read-only access by default and use `persist-credentials: false`.
- Secrets are stored as GitHub repository secrets, never in the code. Cloudflare changes from OpenTofu require
  approval in the `cloudflare` environment, which is limited to `main`.
- Secret scanning with push protection, Dependabot alerts and security updates are on.
- The site sends a strict Content-Security-Policy with Trusted Types and reports violations to `/api/csp` without
  storing IP addresses or page content.

More detail (in Norwegian): [docs/security.md](docs/security.md).

[`/.well-known/security.txt`](https://hofstad.net/.well-known/security.txt) points here. The build fails when it is
within 30 days of expiring.
