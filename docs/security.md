# Sikkerhet

Prinsippene er ingen implisitt tillit, minst mulig tilgang og alt som kode. Rapportering av sårbarheter er
beskrevet i [SECURITY.md](../SECURITY.md).

## Angrepsflate

- Ingen server, database, innlogging eller adminpanel. Siden er statiske filer hos Cloudflare.
- Én Worker med to adresser: `GET /api/status` og `POST /api/csp`. Ingen parametere, ingen hemmeligheter, og
  adressen Workeren henter fra er fast i koden.
- Ingen skjemaer som sender data utenfor siden. Søket skjer i nettleseren.

## Nettleseren

Hodene ligger i `public/_headers` og følger med hver publisering. Workeren setter egne hoder på sine svar.

- **Content-Security-Policy** uten innebygd kode. Alt lastes fra siden selv, med disse unntakene:
  - videorammer fra `www.youtube-nocookie.com` og `player.vimeo.com`, først når den besøkende trykker på spill av
  - skriptet til Cloudflare Web Analytics fra `static.cloudflareinsights.com`, som sender måletall til
    `cloudflareinsights.com`

  `'wasm-unsafe-eval'` trengs fordi søket kjører WebAssembly fra siden selv. `form-action 'self'` trengs fordi
  søkefeltet på 404-siden sender til `/sok/`. `scripts/check-csp.mjs` stopper bygget hvis HTML-en får innebygd kode.
- **Trusted Types** er påkrevd: skript kan ikke sette inn HTML som tekst (`innerHTML` o.l.) eller sette
  skriptadresser fra tekst. Eneste policy er «default» i `src/scripts/search-engine.js`, og den slipper bare gjennom
  `/pagefind/pagefind-worker.js`.
- **HSTS** i to år med `includeSubDomains` og `preload`, `X-Content-Type-Options`, `X-Frame-Options: DENY`,
  `Referrer-Policy`, `Permissions-Policy` og `Cross-Origin-Opener-Policy`.
- **HSTS preload:** hofstad.net er meldt inn på preload-listen i nettleserne (hstspreload.org). Nettleserne bruker da
  alltid HTTPS for domenet og alle underdomener, også ved første besøk. Alle nye underdomener må derfor ha HTTPS fra
  start, og `includeSubDomains` og `preload` må bli stående i `public/_headers`. Å komme ut av listen tar måneder.
- **Cross-Origin-Resource-Policy: same-origin**, unntatt `/_astro/*` og `/assets/*` (`cross-origin`), så bilder og
  logoer vises i RSS-lesere og ved deling.
- Ingen informasjonskapsler. Valget av lys eller mørk visning lagres bare i nettleseren.

### Rapporter om brudd

CSP-en har `report-uri /api/csp` og `report-to csp` (`Reporting-Endpoints`), så nettlesere melder fra når noe blir
stoppet. `worker/csp-report.js` logger side, direktiv, blokkert opphav og kildefil i Workers Logs med
`console.error`, slik at en ny type brudd blir en «issue» og gir varsel på e-post.

Det lagres ikke IP, nettleserinfo, spørrestrenger, fragmenter eller kodeutdrag (`sample`). Rapporter fra
nettleserutvidelser og andre nettsteder ignoreres. Maks 16 kB og 10 rapporter per forespørsel, og svaret er alltid
204 uten innhold. Grensen på 16 kB gjelder det som faktisk leses (`worker/body.js`), så den virker også når
`Content-Length` mangler eller er feil.

## Logger

Workers Logs inneholder bare linjene Workeren skriver selv, og ingen personopplysninger:

| Linje | Eksempel |
|---|---|
| Én linje per kall til `/api/` (`console.log`) | `api path=/api/status status=200 result=not-live cache=hit`, `api path=/api/csp status=204 reports=1` |
| Brudd på CSP og Trusted Types (`console.error`) | Se [Rapporter om brudd](#rapporter-om-brudd) |
| Ukjent svar fra LiveTrack24 (`console.warn`) | Utdrag av svaret fra LiveTrack24, ikke fra den besøkende |

- Linjen per kall har bare faste verdier fra koden: adressen, statuskoden, resultatet, mellomlageret og antall
  rapporter. Ukjente adresser under `/api/` logges som `path=other`. Aldri IP, nettleserinfo, spørrestrenger eller
  innhold fra forespørselen.
- Cloudflares egen logg per kall (`invocation_logs`) er slått av i `wrangler.jsonc`, fordi den tar med IP-adresse,
  nettleserinfo og hele adressen.
- Sporing (`traces`) er slått av, fordi Cloudflare tar med nettleserinfo (`user_agent.original`), hele adressen med
  spørrestreng (`url.full`) og hoder som `accept-language` i sporene.
- Loggene lagres hos Cloudflare i inntil 7 dager (gratisplanen).

## Cloudflare-sonen

Oppsettet er kode i `infra/` og endres bare via pull request. Se [infra/README.md](../infra/README.md).

- **DNSSEC** med DS-posten hos registraren. TLS 1.2 som minimum, TLS 1.3, «Always Use HTTPS».
- **CAA:** `infra/` legger inn `letsencrypt.org`, `pki.goog` og `ssl.com`. Cloudflare legger i tillegg automatisk til
  `comodoca.com` og `digicert.com` når sonen har egne CAA-poster, så Universal SSL kan bytte utsteder. Andre utstedere
  kan ikke lage sertifikater for domenet. Det er ingen `iodef`-adresse: få utstedere sender slike rapporter, og
  sertifikatsjekken i hofstadnet/operations dekker behovet.
- **Nye sertifikater:** sertifikatsjekken i [hofstadnet/operations](https://github.com/hofstadnet/operations) leser
  Certificate Transparency-loggene hver dag og lager en issue for sertifikater fra ukjente utstedere eller for ukjente
  navn. Den erstatter CT-varslingen i Cloudflare. Eieren kan slå av CT-varslingen når sjekken kjører.
- **E-post:** domenet tar bare imot (Email Routing). SPF, DKIM og DMARC med `p=reject` og streng samsvar, så e-post
  som utgir seg for å komme fra `@hofstad.net`, avvises. `www` har «null MX».
- **GitHub Pages:** domenet er verifisert for organisasjonen hofstadnet, så ingen andre kan ta i bruk
  `status.hofstad.net` eller andre underdomener på GitHub Pages.
- **Google Search Console:** eierskapet er bekreftet med en TXT-post (`google-site-verification`) i `infra/`. Den må
  bli liggende, ellers mister eieren tilgangen i Search Console.
- **WAF:** Cloudflares gratis regelsett og én egen regel som blokkerer `.php`, `/wp-admin`, `/wp-includes`,
  `/wp-json`, `/.env` og `/.git`.
- **Rate limiting:** over 20 kall på 10 sekunder fra samme IP til `/api/status` og `/api/csp` blokkeres i 10 sekunder.
- **Roboter:** KI-roboter som henter innhold til trening blokkeres. Bot Fight Mode er av, fordi den legger inn et
  innebygd skript som CSP-en stopper, og fordi den kan stoppe RSS-lesere.
- **DDoS-vern** er inkludert i gratisplanen.

## Tilganger og nøkler

Ingen nøkler ligger i repoet. Tokens som brukes av GitHub Actions, ligger som GitHub-secrets: tokenet som kan endre
Cloudflare-sonen, bare i miljøet `cloudflare`, og resten på repoet.

| Nøkkel | Type | Tilgang | Brukes av |
|---|---|---|---|
| `hofstadnet-tofu-read` (`CLOUDFLARE_API_TOKEN_READ`, repoet) | Cloudflare-kontotoken | hofstad.net: DNS, Zone Settings, Zone WAF, Bot Management, Dynamic URL Redirects og Zone (Read). Kontoen: Notifications (Read). | `plan` og `drift` i `infra.yml`, tokenutløp i `token-expiry.yml` |
| `hofstadnet-tofu` (`CLOUDFLARE_API_TOKEN`, miljøet `cloudflare`) | Cloudflare-kontotoken | hofstad.net: DNS, Zone Settings, Zone WAF, Bot Management og Dynamic URL Redirects (Edit), Zone (Read). Kontoen: Notifications (Edit). | `apply` i `infra.yml` |
| `hofstadnet-tofu-state` (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, repoet) | R2-kontotoken | Object Read & Write på bøtta `hofstadnet-tofu` | OpenTofu-state, både plan og apply |
| `TOFU_STATE_PASSPHRASE` (repoet) | Passfrase | Krypterer og dekrypterer state | OpenTofu, både plan og apply |
| `ALERT_EMAIL` | E-postadresse | Mottaker av varsler fra Cloudflare. Ligger som secret så den ikke står i det offentlige repoet, og er merket `sensitive` så den ikke vises i planer. | OpenTofu |
| `hofstadnet-web-builds` | Cloudflare-brukertoken, styrt av Workers Builds | Kontoen: Workers Scripts (Edit), Account Settings (Read). hofstad.net: Workers Routes (Edit). Bruker: Memberships og User Details (Read). | Publisering fra `main` og forhåndsvisninger |

- Tokenene for OpenTofu har samme utløpsdato. `token-expiry.yml` sjekker lesetokenet og oppretter en issue 30 dager
  før. Skrivetokenet sjekkes ikke av en planlagt jobb, fordi jobber i miljøet `cloudflare` venter på godkjenning.
- Pull requests og planen kan bare lese Cloudflare. Bare `apply` i miljøet `cloudflare` har tokenet som kan endre
  sonen.
- R2-nøklene og passfrasen ligger på repoet, fordi både plan og apply leser og låser state.
- Byggetokenet er et brukertoken fordi Workers Builds ennå ikke støtter kontotokens. Det har ingen utløpsdato, fordi
  publiseringen ellers ville stoppet.
- Apply i OpenTofu kjører i miljøet `cloudflare`, som krever godkjenning og bare tillater `main`.
- Kontoene hos GitHub og Cloudflare skal ha passnøkkel eller sikkerhetsnøkkel som tofaktor, med
  gjenopprettingskoder lagret utenfor begge tjenestene.

## Forsyningskjede og endringer

- `main` er sannheten: det som ligger der, er i drift. Tilbakerulling er `git revert`.
- Regelsettet på `main` krever pull request og grønne sjekker (`build`, `dependency-review`, `workflow-security`),
  stopper ved CodeQL-funn med høy alvorlighet, og blokkerer force-push og sletting.
- Actions er låst til commit-SHA. npm-pakker installeres fra låsefil med `npm ci --ignore-scripts`, og
  `npm audit signatures` stopper bygget hvis en pakke mangler gyldig signatur fra registeret.
- Dependabot foreslår nye versjoner én gang i måneden, tidligst 7 dager etter utgivelse, og 30 dager for
  major-versjoner av npm-pakker.
  Patch og minor for npm og Actions merges automatisk når alle sjekker er grønne, etter kriteriene i
  [hofstadnet/guidelines](https://github.com/hofstadnet/guidelines/blob/main/github-security.md#automatisk-merge).
  `wrangler` (publiserer siden), OpenTofu-provideren (endrer Cloudflare) og major-versjoner merges manuelt.
- Arbeidsflyter har bare lesetilgang som utgangspunkt og `persist-credentials: false`. Jobber som trenger mer, ber om
  det selv.
- Secret scanning med push protection, Dependabot-varsler og sikkerhetsoppdateringer er slått på.
- CodeQL kjører på pull requests, på `main` og hver uke. OpenSSF Scorecard kjører hver uke.
- `/.well-known/security.txt` peker til [SECURITY.md](../SECURITY.md). Bygget stopper når den har under 30 dager igjen.
