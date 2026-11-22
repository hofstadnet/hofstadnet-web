# Arkitektur for hofstad.net

Status: siden er bygget i Astro og testet lokalt, november 2026. Ingenting er satt i drift. Dokumentet beskriver valgene bak den nye siden, slik at de
kan etterprøves og endres i en pull request.

## Kort oppsummert

| Område | Valg | Hvorfor |
|---|---|---|
| Rammeverk | [Astro](https://astro.build) (MIT) | Bygger ren HTML uten JavaScript som standard. Innhold i Markdown med skjemavalidering. |
| Innhold | Markdown-filer i repoet | Én forfatter. Git er redigeringshistorikk, godkjenning og backup. |
| Kode | GitHub, organisasjonen HofstadNET | Felles sikkerhetsoppsett finnes allerede i `.github`-repoet. |
| Hosting | Cloudflare Workers med statiske filer | Gratis, ingen egen server, og ingen origin som kan nås utenom Cloudflare. Cloudflare anbefaler Workers fremfor Pages for nye prosjekter. |
| Live-status | Liten Worker på `/api/status` | Holder PGpilot-nøkkelen unna nettleseren og mellomlagrer svaret. |
| Skrifter, ikoner, skript | Ligger i repoet | Siden laster ingenting fra andre domener. Overskriftene bruker Barlow Semi Condensed (åpen lisens). |
| Visning | Mørk som standard | Den besøkende kan bytte til lys. Valget lagres lokalt i nettleseren. |

## Hvorfor ikke GitHub Pages bak Cloudflare

Det er den andre åpenbare gratisløsningen, men den har to svakheter her:

1. `hofstadnet.github.io` ville fortsatt svart direkte på internett. WAF og DDoS-vern hos Cloudflare gjelder bare
   trafikk som går via Cloudflare, så beskyttelsen kan omgås.
2. Flystatusen trenger en liten serverdel som spør LiveTrack24 på vegne av siden. Det har ikke GitHub Pages.

Med filene hos Cloudflare finnes det ingen origin å beskytte, og statiske filer og API ligger på samme plattform.

## Trafikkflyt

```
Besøkende ──► Cloudflare (DNS, TLS, WAF, DDoS, cache)
                 ├── statiske filer (bygget av Astro)
                 └── /api/status ──► Worker ──► PGpilot API (Bearer-token, lagret som Worker-secret)

Utvikling: PR ──► GitHub Actions (bygg + sikkerhetssjekker) ──► merge til main ──► deploy til Cloudflare
```

## Innholdsmodell og områder

Hvert innlegg er én Markdown-fil i `src/content/innlegg/`. Feltene valideres ved bygg mot
`src/content.config.ts`, så et innlegg med ukjent område eller manglende dato stopper bygget i stedet for å havne
feil på siden. Feltene er beskrevet i [README](../README.md#skrive-et-innlegg).

Innleggene sorteres på tre måter, med hver sin jobb:

- **Område** svarer på «hva handler det om». Det finnes fem, valgt av eier: I lufta, Ute i naturen, Under
  overflaten, Bak kameraet og Foran skjermen. Et innlegg kan høre til flere. ID-ene (`luft`, `natur`, `vann`,
  `foto-video`, `skjerm`) er faste og brukes i adresser, mens navnene kan endres i `src/lib/omrader.ts`.
- **Type** svarer på «hva slags innhold er det»: innlegg, notat, test, video eller prosjekt. De gamle
  WordPress-kategoriene «Test» og «Video» var egentlig typer og er flyttet dit.
- **Stikkord** er frie og brukes foreløpig ikke til egne sider.

Innlegg om å lage en nettside ligger i «Foran skjermen», også når nettsiden handler om flyging. «I lufta» er
forbeholdt turer og opplevelser.

Adresser: `/innlegg/<filnavn>/`, `/innlegg/` (arkiv), `/omrade/<id>/` og `/rss.xml`. De gamle WordPress-adressene
(`/2019/10/14/<slug>/`) videresendes permanent i `public/_redirects`.

### Senere: CMS eller database

- **CMS:** Et git-basert CMS (for eksempel Decap, Sveltia eller Keystatic, alle åpen kildekode) redigerer de samme
  Markdown-filene og åpner en pull request. Det krever ingen endring i arkitekturen.
- **Database:** Sidene henter innhold gjennom Astros innholdslag, ikke direkte fra filer. En ny innholdskilde (for
  eksempel Cloudflare D1) legges til som en ny «loader» med samme skjema. Dynamiske funksjoner legges under `/api/`
  som egne Workers, hver med bare de tilgangene den trenger.

## Live-status fra PGpilot

Dagens widget går mot Livetrack24. Gjennomgangen av PGpilot-API-et (`pgpilot.app/docs/api.md`) ga dette:

- API-et er dokumentert som lesetilgang til pilotens egne data, med Bearer-token fra OAuth (PKCE).
- Det finnes **ikke** noe dokumentert endepunkt for «flyr nå» eller live-posisjon, og ingen innbyggbar widget.
- Tokenet varer i 90 dager og kan ikke fornyes automatisk.
- CORS og vilkår for visning på andre nettsteder er ikke omtalt.

Konsekvenser for løsningen:

1. Tokenet gir tilgang til hele flyloggen og skal aldri ligge i nettleseren. En Worker på `/api/status` kaller
   PGpilot, og returnerer bare det siden trenger: status, sted, høyde og tidspunkt.
2. Workeren mellomlagrer svaret (for eksempel 60 sekunder), slik at besøk på siden ikke blir til trafikk mot PGpilot.
3. Siden må fungere uten svar. Uten status vises siste kjente tur, og resten av siden er upåvirket.
4. Tokenet må byttes manuelt hver 90. dag. Workeren bør varsle når det nærmer seg.

**Uavklart, må sjekkes før bygging:** Flylisten har feltet `is_complete`. En pågående tur vises trolig med
`is_complete: false`, og kan da brukes som «i lufta»-signal. Det er ikke bekreftet. Spør PGpilot om dette, om et
eget live-endepunkt, og om det er greit å vise dataene på en egen side. Til det er avklart beholdes Livetrack24 som
kilde bak den samme `/api/status`, slik at kilden kan byttes uten å røre nettsiden.

### Oppdatert 21. november 2026: live-kart

- `https://www.livetrack24.com/user/krishofs/2d` kan vises i en `iframe`. Forsiden laster kartet først når den
  besøkende trykker «Vis live-kart», og fjerner det igjen når det skjules. Uten trykk går det ingen trafikk til
  LiveTrack24. CSP må tillate `frame-src https://www.livetrack24.com`, og ingenting annet fra tredjepart.
- `https://pgpilot.app/view/krishofs` svarer med `X-Frame-Options: DENY` og kan ikke bygges inn. Den brukes som
  vanlig lenke.
- Automatisk «i lufta nå» uten trykk krever fortsatt en Worker som spør LiveTrack24 eller pgpilot. LiveTrack24 har
  egne sider for innbygging, RSS og API (`/docs/embed`, `/docs/rss`, `/docs/api`) som må leses før det bygges.

## E-post

Webhotellet hos ProISP er sagt opp, og e-posten fulgte med. Cloudflare Email Routing (gratis) kan ta imot post til
adressene på `hofstad.net` og videresende den til en privat innboks:

- Opprett en regel per adresse som finnes i dag, og eventuelt en oppsamlingsregel for resten.
- Cloudflare legger inn MX- og SPF-postene selv når domenet ligger hos dem.
- Dette er bare mottak. Skal du **sende** fra en `hofstad.net`-adresse, trengs en egen utsendingstjeneste. Uten det
  går svarene ut fra den private adressen.
- Sett DMARC til `p=reject` med en rapportadresse, slik at ingen andre kan sende i domenets navn.

## Sikkerhet

Prinsippene er de samme som i resten av organisasjonen: ingen implisitt tillit, minst mulig tilgang, alt som kode.

### Zero Trust og minste privilegium

- **Ingen server å logge inn på.** Ingen SSH, intet adminpanel, ingen database i første versjon. WordPress-flaten
  (`wp-login.php`, `xmlrpc.php`, utvidelser) forsvinner helt.
- **Kontoer:** GitHub og Cloudflare med passnøkkel eller sikkerhetsnøkkel som tofaktor. Gjenopprettingskoder
  oppbevares utenfor begge tjenestene.
- **Deploy-tilgang:** Cloudflare Workers Builds henter repoet via GitHub-appen og publiserer fra `main`. Det finnes
  ingen API-token for publisering i GitHub. Workflows har `permissions: contents: read` som utgangspunkt.
  Byggetokenet (`hofstadnet-web-builds`) har bare det publiseringen trenger: Workers Scripts Edit og Account Settings
  Read på kontoen, Workers Routes Edit på hofstad.net, og Memberships Read og User Details Read. Det er et brukertoken,
  fordi Workers Builds ennå ikke støtter kontotokens. Bytt når det kommer.
- **OpenTofu-tilgang:** kontotokenet `hofstadnet-tofu` (DNS, Zone Settings, Zone WAF, Bot Management og Dynamic URL
  Redirects på hofstad.net, Zone Read, og Notifications på kontoen) og R2-tokenet `hofstadnet-tofu-state`
  (Object Read & Write på bøtta `hofstadnet-tofu`). Begge ligger som GitHub-secrets og utløper 22.11.2027.
- **Hemmeligheter:** Workeren har ingen. Statustjenesten leser en offentlig adresse hos LiveTrack24.
- **Forhåndsvisninger** av pull requests bygges av Workers Builds. Repoet er offentlig, så innholdet i en PR er
  uansett synlig. Det gjelder også innlegg merket `utkast: true`: de vises ikke på siden, men Markdown-filen kan leses
  på GitHub.
- **Egne domener:** Workeren svarer bare på hofstad.net og www.hofstad.net. `workers_dev` er slått av.
- **Nettleseren stoler heller ikke på siden:** streng Content-Security-Policy uten innebygde skript, pluss HSTS,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP og CORP. Trusted Types er påkrevd, så
  skript kan ikke sette inn HTML som tekst. Eneste policy («default» i `src/scripts/sok-motor.js`) slipper bare
  gjennom `/pagefind/pagefind-worker.js`. Bilder og logoer har `Cross-Origin-Resource-Policy: cross-origin`, så de
  vises i RSS-lesere. Tredjepartsdomener er bare videorammer fra
  YouTube og Vimeo og Cloudflare Web Analytics (skript fra `static.cloudflareinsights.com`, måletall til
  `cloudflareinsights.com`). Hodene ligger i repoet og følger med hver deploy.

### Cloudflare

- DNS med DNSSEC (DS-posten ligger hos registraren Dynadot), TLS 1.2 som minimum, «Always Use HTTPS» og HSTS.
- CAA-poster: bare `letsencrypt.org`, `pki.goog` og `ssl.com` kan utstede sertifikater (de Cloudflare bruker for
  Universal SSL). Avviste forsøk meldes til admin@. Sammen med CT-varslingen gir det beskjed om falske sertifikater.
- E-post: domenet tar bare imot (Email Routing). DMARC er `p=reject` med streng samsvar, så e-post som utgir seg
  for å komme fra `@hofstad.net` avvises.
- `hofstad.net` er verifisert for GitHub Pages i organisasjonen hofstadnet (TXT-posten
  `_github-pages-challenge-hofstadnet`). Da kan ingen andre GitHub-kontoer ta i bruk `status.hofstad.net` eller andre
  underdomener på Pages, selv om CNAME-en skulle peke dit mens repoet er borte. Posten må bli liggende.
- DDoS-vern er inkludert i gratisplanen.
- Varsler (Notifications) på e-post til admin@: ny feiltype i Workeren (Workers Observability, «Real-Time Issue»)
  og HTTP DDoS-angrep mot sonen.
- WAF: gratisplanen har Cloudflares eget gratis regelsett og noen få egendefinerte regler. Fullt OWASP Core Ruleset
  har vært forbeholdt betalte planer. For en statisk side uten skjema og innlogging er angrepsflaten uansett liten.
  Én egendefinert regel blokkerer `.php`, `/wp-admin`, `/wp-includes`, `/wp-json`, `/.env` og `/.git`.
- Rate limiting på `/api/status`: over 20 kall på 10 sekunder fra samme IP blokkeres i 10 sekunder.
- KI-roboter som henter innhold til trening blokkeres. Bot Fight Mode er av: den krever at Cloudflare legger inn
  et innebygd skript (JavaScript detections), som den strenge CSP-en uansett stopper. Den kunne også stoppet RSS-lesere.
- Browser Cache TTL er «Respect Existing Headers», så `Cache-Control` fra siden og Workeren gjelder. Flystatusen
  mellomlagres derfor bare i 60 sekunder.
- Workeren, hodene og videresendingene er kode i repoet (`wrangler.jsonc`, `public/_headers`, `public/_redirects`).
  Soneoppsettet over (DNS, CAA, DNSSEC, innstillinger, WAF, rate limiting, videresending fra www, KI-roboter og
  varsler) er kode i `infra/` (OpenTofu), med kryptert state i R2 og apply etter godkjenning. Se `infra/README.md`.

### GitOps og DevSecOps

- `main` er sannheten. Det som ligger i `main`, er det som er i drift. Tilbakerulling er `git revert`.
- Direkte push til `main` er blokkert. Alt går via pull request med grønne sjekker, også når det bare er én bidragsyter.
- Sjekkene fra organisasjonens maler gjenbrukes: `dependency-review`, `workflow-security` (zizmor), CodeQL og
  OpenSSF Scorecard. I tillegg: bygg, typesjekk, lenkesjekk og validering av innholdsskjemaet.
- Actions er pinnet til commit-SHA. Avhengigheter installeres fra låsefil med `npm ci`. Dependabot holder begge oppdatert.
- Bygget får en signert opprinnelsesattest (build provenance), slik at det som ligger på Cloudflare kan spores til en
  bestemt commit og kjøring.
- Secret scanning med push protection står på.

## Offentlig eller privat repo

**Anbefaling: offentlig.**

| | Offentlig | Privat |
|---|---|---|
| CodeQL, dependency review, Scorecard | Gratis | Krever betalt GitHub Code Security |
| Dokumentasjon synlig for andre | Ja | Nei |
| Utkast | Synlige i branches | Skjult |
| Hosting hos Cloudflare | Fungerer | Fungerer |

Siden er offentlig uansett, og repoet inneholder ingen hemmeligheter når tokenene ligger hos Cloudflare. Et offentlig
repo gir gratis tilgang til nettopp de sikkerhetsverktøyene organisasjonens maler bygger på, og det viser frem
arbeidet. Det som taler for privat, er upubliserte utkast. Det løses enklere ved å skrive utkast lokalt til de er
klare, eller ved å ha et lite privat repo bare for kladd.

To ting må holdes utenfor et offentlig repo: WordPress-dumpen (`wp-config.php`, databaseeksport) og originalbilder med
posisjonsdata. Bilder strippes for EXIF ved bygg.

## Flytting fra ProISP

Rekkefølge som unngår nedetid:

1. Kartlegg hva ProISP faktisk leverer i dag: webhotell, DNS, domeneregistrering og **e-post** (`brev@hofstad.net`).
   E-posten må ha et nytt hjem før DNS flyttes, ellers stopper den.
2. Eksporter innlegg og bilder fra WordPress til Markdown.
3. Sett opp siden på en midlertidig adresse hos Cloudflare og kontroller videresendingene.
4. Flytt DNS til Cloudflare med alle eksisterende poster, inkludert MX, SPF, DKIM og DMARC.
5. Pek domenet mot den nye siden. Behold WordPress-backupen til alt er verifisert, og si opp webhotellet etterpå.

## Status for bygget (21. november 2026)

Gjort:

- Astro-prosjekt med forside, innleggssider, arkiv, områdesider, RSS, nettstedskart, personvernside og 404.
- Sju innlegg: tre nye og fire flyttet fra WordPress.
- Flystatus: `worker/index.js` (Cloudflare Worker, kjøres bare for `/api/`) leser LiveTrack24 sin statusrute
  (`/user/krishofs/status/map/1`) og svarer med `live`, `ikke-live` eller `ukjent`. Svaret mellomlagres i 60
  sekunder. Forsiden viser grønn prikk og «I lufta nå» når sporingen er aktiv, og kartet åpnes hos LiveTrack24 i
  ny fane. Besøkende kontakter ikke LiveTrack24 før de selv åpner kartet, og siden har ingen ramme derfra.
- Streng CSP uten innebygd kode, kontrollert av `scripts/sjekk-csp.mjs` i hvert bygg. Brudd hos besøkende meldes
  til `/api/csp` (`worker/csp-rapport.js`) og logges anonymisert i Workers Logs.
- Arbeidsflyter for bygg, `dependency-review`, zizmor og CodeQL, med actions pinnet til commit.

Gjenstår:

- ~~Koble repoet til Cloudflare og bytte domenet~~ Gjort 21. november 2026: Workers Builds publiserer fra `main`,
  og `hofstad.net` og `www.hofstad.net` peker på Workeren.
- Flytte DNS til Cloudflare og sette opp Email Routing.
- Bekrefte flystatusen under en ekte tur. Tjenesten er testet mot LiveTrack24 når sporingen er av. Hvordan
  statusruten ser ut når sporingen er på, er ikke sett, så gjenkjenningen av «live» bygger på en antakelse.
- Hente den opprinnelige teksten til de fire gamle innleggene fra WordPress. Clug-innlegget er skrevet på nytt ut
  fra et sammendrag, og «Velkommen» har bare én linje.
- OpenSSF Scorecard hvis repoet blir offentlig.
