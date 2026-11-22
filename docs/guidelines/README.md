# Retningslinjer

Regler og sjekklister for arbeid i repoet. De gjelder både mennesker og kodeagenter, og lenkes fra
[AGENTS.md](../../AGENTS.md).

| Retningslinje | Når |
|---|---|
| [Navngivning](#navngivning) | Alltid |
| [documentation.md](documentation.md) | Før hver pull request som endrer kode, oppsett eller arbeidsflyter |
| [security-checklist.md](security-checklist.md) | Endringer i hoder, Workeren, arbeidsflyter, avhengigheter eller `infra/` |
| [ux-checklist.md](ux-checklist.md) | Endringer i utseende, komponenter, stilark eller skript i nettleseren |
| [new-post.md](new-post.md) | Nye eller endrede innlegg |

Endringer i Cloudflare-sonen følger [infra/README.md](../../infra/README.md).

## Navngivning

| Engelsk | Norsk |
|---|---|
| Mapper og filnavn | Innholdet på siden |
| Kode: variabler, funksjoner, komponenter, CSS-klasser, felt i innholdsmodellen | Adresser på siden (`/innlegg/`, `/omrade/luft/`) |
| npm-skript, arbeidsflyter, jobbnavn og branch-navn | Dokumentasjon og kommentarer i koden |
| Tokens, secrets, variabler, miljøer, bøtter og OpenTofu-ressurser | Commit-meldinger og pull requests |

Navn skrives med små bokstaver og bindestrek (for eksempel «link-check.yml» og «check-csp.mjs»), unntatt der
språket har egne regler: PascalCase for komponenter, camelCase for variabler og SCREAMING_SNAKE_CASE for secrets.
