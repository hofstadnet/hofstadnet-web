# Sikkerhet

## Rapportere et sikkerhetsproblem

Ikke opprett en offentlig issue. Bruk **Report a vulnerability** under fanen **Security** i dette repoet, så bare
vedlikeholderne ser rapporten. Beskriv hva du fant, hvordan det kan gjenskapes, og hva det påvirker. Dette er et
personlig prosjekt, så svaret kan ta noen dager.

Rapporten kan skrives på norsk eller engelsk.

## Omfang

- Siden https://hofstad.net og koden i dette repoet.
- Endepunktene i Workeren: `GET /api/status` og `POST /api/csp`.
- Cloudflare-oppsettet i `infra/`.

Rapporter om hoder som mangler med vilje, grensene for rate limiting eller de offentlige DNS-postene er vanligvis
utenfor omfanget, med mindre de fører til et konkret angrep.

## Dette er på plass

- Alle endringer på `main` går via pull request. Påkrevde sjekker: `build`, `dependency-review` og
  `workflow-security` (zizmor). Funn fra CodeQL med alvorlighet high eller høyere stopper merge. Force push og
  sletting av `main` er blokkert.
- Actions er låst til commit-SHA. npm-pakker installeres fra låsefilen uten installasjonsskript, og bygget stopper
  hvis en pakke mangler gyldig signatur fra registeret.
- Dependabot foreslår oppdateringer månedlig, med en ventetid på 7 dager.
- Arbeidsflyter har bare lesetilgang som standard og bruker `persist-credentials: false`.
- Repoet har ingen hemmeligheter. Tokenene ligger i to GitHub-miljøer som bare tillater `main`: lesetokenene i
  `tofu-plan`, og tokenene som kan endre Cloudflare, i `cloudflare`, som krever godkjenning.
- Secret scanning med push protection, Dependabot-varsler og sikkerhetsoppdateringer er slått på.
- Siden sender en streng Content-Security-Policy med Trusted Types og rapporterer brudd til `/api/csp` uten å lagre
  IP-adresser eller sideinnhold.

Mer om sikkerhetsmodellen: [docs/security.md](docs/security.md).

[`/.well-known/security.txt`](https://hofstad.net/.well-known/security.txt) peker hit. Bygget stopper når den har
under 30 dager igjen.
