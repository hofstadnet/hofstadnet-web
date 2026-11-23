# Drift

Publisering, automatiske kontroller, overvåking og fremgangsmåter for vanlige oppgaver.

## Publisering

- **Siden:** Cloudflare Workers Builds bygger med `npm run build` og publiserer med `npx wrangler deploy` hver gang
  `main` endres. Pull requests får en egen forhåndsvisning. Oppsettet ligger i `wrangler.jsonc`.
- **Cloudflare-sonen:** `infra.yml` kjører OpenTofu. Planen vises på pull requests og før apply, og apply etter merge
  krever godkjenning i miljøet `cloudflare`. Se [infra/README.md](../infra/README.md).
- **Statussiden:** [status.hofstad.net](https://status.hofstad.net) er Upptime i repoet
  [hofstadnet/status](https://github.com/hofstadnet/status), publisert med GitHub Pages.

## Arbeidsflyter

| Arbeidsflyt | Når | Hva |
|---|---|---|
| `ci.yml` (Build) | PR og `main` | `npm audit signatures`, enhetstester, bygg med typesjekk, ingen innebygd kode, gyldig `security.txt`, kontroll av dokumentasjonen |
| `security.yml` | PR | `dependency-review` og `workflow-security` (zizmor) |
| `code-scanning.yml` | PR, `main`, mandager | CodeQL for JavaScript, TypeScript og arbeidsflyter |
| `scorecard.yml` | Mandager | OpenSSF Scorecard |
| `quality.yml` | PR | Lighthouse med poenggrenser og ytelsesbudsjett, Playwright med tilgjengelighet og skjermbilder |
| `link-check.yml` | PR og mandager | lychee: interne lenker på PR, også eksterne lenker på mandager |
| `health.yml` | Hver time | Sikkerhetshoder på `/` og `/en/`, sertifikatets utløp, videresending fra www og JSON fra `/api/status`. Åpner og lukker en issue. |
| `production.yml` | Mandager | Lighthouse og tilgjengelighetstestene mot https://hofstad.net |
| `infra.yml` | Endringer i `infra/`, mandager | OpenTofu: sjekk, plan, apply (med godkjenning) og ukentlig avvikssjekk |
| `token-expiry.yml` | Mandager | Varsler når Cloudflare-tokenet til OpenTofu har under 30 dager igjen |
| `dependabot-automerge.yml` | Dependabot-PR | Automatisk merge av patch og minor for npm og Actions |

Påkrevde sjekker før merge til `main`: `build`, `dependency-review`, `workflow-security` og CodeQL.

### Grenser i kvalitetssjekkene

- **Lighthouse** (`lighthouserc.json`, `lighthouserc.production.json`): tilgjengelighet og SEO minst 95 stopper.
  Ytelse og beste praksis under 90 gir advarsel. Ytelsesbudsjett per side: JavaScript 40 kB, CSS 25 kB, skrift 60 kB,
  bilder 400 kB, totalt 600 kB og maks 5 forespørsler til tredjeparter.
- **Tilgjengelighet** (`tests/accessibility.spec.ts`): axe mot WCAG 2.2 AA på alle sider i nettstedskartet, på norsk
  og engelsk, i mørk og lys visning, på 320 og 1280 px. Stopper også ved horisontal rulling, CSP-brudd og
  JavaScript-feil. Egne tester søker på begge språk, sjekker språkvelgeren og `<html lang>`, blar i galleriet og
  sender rapporter til `/api/csp`.
- **Skjermbilder** (`tests/visual.spec.ts`): forside, innlegg og «I lufta» i mørk og lys visning på pc og mobil,
  den engelske forsiden i mørk visning på pc, og søkepanelet. Flystatus og tall som endres med nye turer, er dekket til. Maks 1 % avvik.

## Overvåking og varsler

| Hva | Hvor | Varsel |
|---|---|---|
| Oppetid for forsiden, `/api/status`, søket og RSS (de norske adressene) | status.hofstad.net, hvert 5. minutt | Issue i `hofstadnet/status` |
| Sikkerhetshoder, sertifikat, videresending fra www og `/api/status` | `health.yml`, hver time | Issue (etikett «bug»), lukkes når alt er i orden |
| Besøk og Core Web Vitals | Cloudflare Web Analytics | — |
| Logger og feil i Workeren (én linje per kall, uten IP) | Workers & Pages → hofstadnet-web → Observability | E-post ved ny feiltype |
| Brudd på CSP og Trusted Types hos besøkende | Workers Logs (`type: csp-violation`) | E-post ved ny feiltype |
| DDoS-angrep mot sonen | Cloudflare Notifications | E-post |
| Nye sertifikater for hofstad.net | Certificate Transparency i Cloudflare | E-post |
| Avvik mellom Cloudflare og `infra/` | `infra.yml`, mandager | Issue |
| Tokenutløp | `token-expiry.yml`, mandager | Issue |
| Ytelse og tilgjengelighet i drift | `production.yml`, mandager | Feilet kjøring |
| Døde eksterne lenker | `link-check.yml`, mandager | Feilet kjøring |

Varsler fra Cloudflare går til adressen i secreten `ALERT_EMAIL`. Adressen står ikke i repoet.

## Fremgangsmåter

### Oppdatere flystatistikken

Kjør `npm run flight-stats` med mappen med IGC-filer (se [README](../README.md#flystatistikk)), og sjekk inn
`src/data/flight-stats.json` i en PR.

### Endre utseendet

Når en endring skal endre skjermbildene:

1. Kjør Actions → Quality → Run workflow på grenen med «update_screenshots».
2. Last ned artefakten «screenshots» og se gjennom bildene.
3. Legg dem i `tests/screenshots/` i samme PR.

### Endre Cloudflare-oppsettet

Endre `infra/hofstad.net/terraform.tfvars` (eller modulen) i en PR, les planen, merge, og godkjenn apply. Endringer
gjort direkte i dashbordet blir rapportert av avvikssjekken og overskrevet ved neste apply.

### Når helsesjekken lager en issue

Issuen lister det som er galt. Den oppdateres når listen endrer seg, og lukkes av seg selv når alt er i orden igjen.

- **Hoder mangler:** sjekk `public/_headers` og siste publisering i Workers & Pages → hofstadnet-web → Deployments.
  Rull tilbake ved behov (se [Rulle tilbake](#rulle-tilbake)).
- **`/api/status` svarer feil:** se loggene i Workers & Pages → hofstadnet-web → Observability.
- **www videresender ikke:** sjekk videresendingsregelen i `infra/` og kjør Infrastructure → Run workflow.
- **Sertifikatet utløper snart:** Cloudflare fornyer Universal SSL selv. Sjekk SSL/TLS → Edge Certificates, og at
  CAA-postene i `infra/` tillater utstederne (se [security.md](security.md#cloudflare-sonen)).

### Når avvikssjekken lager en issue

Les planen i kjøringen som issuen lenker til. Skal endringen beholdes, legges den inn i `infra/`. Skal den bort, kjøres
Infrastructure → Run workflow på `main`, og apply godkjennes.

### Fornye tokenene

1. Rull eller lag `hofstadnet-tofu` på nytt under Manage Account → Account API Tokens, med tilgangene i
   [security.md](security.md#tilganger-og-nøkler). Legg verdien inn med `gh secret set CLOUDFLARE_API_TOKEN`.
2. Gjør det samme for R2-tokenet `hofstadnet-tofu-state` (R2 → Manage API tokens), med `gh secret set
   R2_ACCESS_KEY_ID` og `gh secret set R2_SECRET_ACCESS_KEY`.
3. Kjør Infrastructure → Run workflow. Planen skal vise «No changes».

### Når et CSP-varsel kommer

Søk etter `csp-violation` i Workers Logs. `directive` viser hvilken regel som slo inn, og `source` og `line` hvor.
`blocked: trusted-types-sink` betyr at et skript har prøvd å sette inn HTML som tekst.

### Rulle tilbake

- **Siden:** `git revert` av endringen i en PR, eller tilbakerulling til en tidligere versjon i Workers & Pages →
  hofstadnet-web → Deployments ved hastverk.
- **Cloudflare-sonen:** `git revert` av endringen i `infra/`, og godkjenn apply.

### Utsatt til provideren støtter det

Worker-varselet «hofstadnet-web: ny feil i Workeren» (`workers_observability_real_time_issue`) ligger i Cloudflare,
men ikke i `infra/`, fordi Cloudflare-provideren ennå ikke godtar den varseltypen. Dependabot foreslår nye versjoner
av provideren. Når typen støttes, legges varselet inn i `terraform.tfvars` og importeres.
