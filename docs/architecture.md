# Arkitektur

Hvordan hofstad.net er satt sammen, og hvorfor. Sikkerhet er beskrevet i [security.md](security.md), og drift i
[operations.md](operations.md).

## Oversikt

| Område | Valg | Hvorfor |
|---|---|---|
| Rammeverk | [Astro](https://astro.build) (MIT) | Bygger ren HTML uten JavaScript som standard. Innhold i Markdown med skjemavalidering. |
| Innhold | Markdown-filer i repoet | Én forfatter. Git gir historikk, gjennomgang og backup. |
| Kode | GitHub, organisasjonen hofstadnet, offentlig repo | Gratis CodeQL, Scorecard og regelsett, og koden kan vises frem. |
| Hosting | Cloudflare Workers med statiske filer | Ingen egen server og ingen origin som kan nås utenom Cloudflare. |
| Serverdel | Én Worker for `/api/` | Flystatus og mottak av CSP-rapporter. Alt annet er statiske filer. |
| Infrastruktur | OpenTofu i `infra/` | Cloudflare-sonen som kode, med plan på PR og godkjent apply. |
| Søk | [Pagefind](https://pagefind.app/) | Indeks bygges sammen med siden. Søket skjer i nettleseren. |
| Skrift, ikoner, skript | Ligger i repoet | Siden fungerer selv om andre tjenester er nede. |
| Visning | Følger systemet, mørk som reserve | Valg i bryteren lagres lokalt i nettleseren. |
| Språk | Norsk på rot, engelsk under `/en/` | Adressen bestemmer språket. Ingen videresending og ingenting lagres. |

## Dataflyt

```mermaid
flowchart LR
  visitor["Besøkende / nettleser"]
  subgraph cloudflare["Cloudflare"]
    edge["Cloudflare<br/>DNS, TLS, WAF, rate limiting, DDoS"]
    static["Statiske filer<br/>dist/, norsk og /en/"]
    worker["Worker<br/>/api/status, /api/csp"]
    logs["Workers Logs<br/>én linje per kall og CSP-rapporter, uten IP"]
    analytics["Cloudflare Web Analytics"]
  end
  subgraph thirdparty["Tredjeparter"]
    livetrack["LiveTrack24<br/>offentlig statusrute, mellomlagret 60 s"]
  end
  visitor -->|"forespørsler"| edge
  edge -->|"HTML, CSS, JS, bilder, søkeindeks"| static
  edge -->|"/api/*"| worker
  worker -->|"henter status"| livetrack
  worker -->|"logglinjer uten IP"| logs
  visitor -->|"anonyme sidevisninger og lastetider, uten informasjonskapsler"| analytics
```

Besøkende når bare Cloudflare. Statiske filer leveres direkte, `/api/` går til Workeren, som henter flystatus fra
LiveTrack24, tar imot CSP-rapporter og skriver logglinjer uten personopplysninger, og nettleseren sender anonyme måletall til Web Analytics.

```mermaid
flowchart LR
  dependabot["Dependabot"] -->|"oppdateringer"| pr["Pull request"]
  pr --> actions["GitHub Actions<br/>bygg, tester, sikkerhet, OpenTofu-plan"]
  actions -->|"grønne sjekker"| main["Merge til main"]
  main --> builds["Workers Builds publiserer siden"]
  main -->|"endringer i infra/"| apply["infra.yml apply<br/>krever godkjenning i miljøet cloudflare"]
  apply --> zone["Cloudflare-sonen"]
```

Endringer, også fra Dependabot, går via pull request og sjekker i GitHub Actions. Etter merge til `main` publiserer
Workers Builds siden, og `infra.yml` oppdaterer Cloudflare-sonen etter godkjenning når `infra/` er endret.

```mermaid
flowchart LR
  site["hofstad.net"]
  subgraph repo["hofstadnet/hofstadnet-web"]
    health["Helsesjekk hver time<br/>hoder, sertifikat, www, /api/status"]
    weekly["Mandager<br/>produksjonstester, avvik i infra, tokenutløp"]
  end
  subgraph ops["hofstadnet/operations, utenfor dette repoet"]
    audit["Ukentlig revisjon<br/>innstillinger i GitHub"]
    certs["Daglig sertifikatsjekk<br/>Certificate Transparency"]
    expiry["Utløp<br/>domene, tokens og nøkler"]
  end
  status["hofstadnet/status<br/>Upptime hvert 5. minutt"]
  health -->|"sjekker"| site
  weekly -->|"sjekker"| site
  status -->|"sjekker"| site
  certs -->|"nye sertifikater for"| site
  health & weekly & audit & certs & expiry & status -->|"issue ved feil"| issues["Issues"]
```

Siden overvåkes fra tre repoer. Dette repoet har helsesjekken og de ukentlige kontrollene. Revisjonen av
innstillingene, sertifikatsjekken og varslene om utløp ligger i [hofstadnet/operations](https://github.com/hofstadnet/operations),
og oppetiden i [hofstadnet/status](https://github.com/hofstadnet/status). Detaljer i
[operations.md](operations.md#overvåking-og-varsler).

## Komponenter

### Statiske sider

Astro bygger alle sider til `dist/` ved `npm run build`. Cloudflare leverer filene direkte uten å kjøre kode.
`public/_headers` setter sikkerhetshoder og mellomlagring, og `public/_redirects` sender eldre adresser videre til de
nye.

Adresser:

| Norsk | Engelsk | Innhold |
|---|---|---|
| `/` | `/en/` | Forside med flystatus, lenker og nyeste innlegg |
| `/innlegg/` og `/innlegg/<filnavn>/` | `/en/posts/` og `/en/posts/<filnavn>/` | Arkiv og innlegg. Samme filnavn på begge språk. |
| `/omrade/<id>/` | `/en/area/<navn>/` | Innlegg per område. «I lufta» har også flystatistikk. Engelske navn: `air`, `nature`, `water`, `photo-video`, `screen`. |
| `/stikkord/` og `/stikkord/<stikkord>/` | `/en/tags/` og `/en/tags/<stikkord>/` | Innlegg per stikkord. Stikkordene er ulike på hvert språk. |
| `/sok/` | `/en/search/` | Søk uten JavaScript, brukt av 404-siden og søkefeltet i Google |
| `/personvern/` | `/en/privacy/` | Hva siden samler inn |
| `/rss.xml` | `/en/rss.xml` | RSS med hele innleggene |
| `/404.html` | `/en/404.html` | Vises for ukjente adresser. Cloudflare leverer den nærmeste, så adresser under `/en/` får den engelske. |
| `/sitemap-index.xml` | | Nettstedskart for begge språk, med `lastmod` og lenker mellom språkversjonene |

Sidene i `src/pages/` er tynne ruter per språk. Innholdet ligger i `src/components/pages/` og får språket fra ruten.

### Worker (`worker/`)

Workeren kjøres bare for adresser under `/api/` (`run_worker_first` i `wrangler.jsonc`) og svarer bare på
hofstad.net og www.hofstad.net. `workers_dev` er slått av.

- **`GET /api/status`** svarer med `live`, `not-live` eller `unknown` (og tidspunktet `checked`) ut fra LiveTrack24 sin
  offentlige statusrute.
  Svaret mellomlagres i 60 sekunder, så besøk blir ikke til trafikk mot LiveTrack24. Tolkingen ligger i
  `src/lib/livetrack-status.js`. Ukjente svar logges, og siden viser da en nøytral tekst.
- **`POST /api/csp`** tar imot rapporter når nettleseren stopper noe på grunn av Content-Security-Policy eller
  Trusted Types (`worker/csp-report.js`). Se [security.md](security.md#rapporter-om-brudd).

Workeren har ingen hemmeligheter og tar ingen parametere. Begge adressene har rate limiting i Cloudflare. Hvert kall
gir én logglinje uten personopplysninger (se [security.md](security.md#logger)).

### Flystatus og flystatistikk

- **Status nå:** forsiden henter `/api/status` og viser «I lufta nå» når sporingen hos LiveTrack24 er aktiv.
  Live-kartet åpnes hos LiveTrack24 i ny fane. Besøkende kontakter ikke LiveTrack24 før de åpner kartet.
- **Siste tur og statistikk:** regnes ut lokalt fra IGC-filer med `npm run flight-stats` og lagres som summer i
  `src/data/flight-stats.json`. Filen inneholder ingen spor eller koordinater.

pgpilot.app brukes som vanlig lenke. Tjenesten har ikke noe offentlig API for live-status, og siden kan ikke bygges
inn (`X-Frame-Options: DENY`).

### Innholdsmodell

Hvert innlegg er én Markdown- eller MDX-fil i `src/content/posts/`, validert mot `src/content.config.ts` ved bygg.
Feltene er beskrevet i [README](../README.md#skrive-et-innlegg). Innleggene sorteres på tre måter:

- **Område** svarer på «hva handler det om»: I lufta, Ute i naturen, Under overflaten, Bak kameraet og Foran
  skjermen. ID-ene (`luft`, `natur`, `vann`, `foto-video`, `skjerm`) er faste og brukes i adresser. Navnene endres i
  `src/i18n/nb.ts` og `src/i18n/en.ts`. Innlegg om nettsider hører til «Foran skjermen», også når de handler om flyging.
- **Type** svarer på «hva slags innhold»: innlegg (`post`), notat (`note`), test (`review`), video (`video`) eller
  prosjekt (`project`).
- **Stikkord** er frie, gir egne sider og brukes til «Les også».

Under innlegget lenker «Nyere innlegg» og «Eldre innlegg» til nabo-innleggene i tid, på samme språk. Hovedbildet vises
under ingressen og lastes før resten av bildene. Videoinnlegg (`hasVideo`) viser det ikke der, fordi det er
forhåndsbildet til videoen. Strukturdataen (`src/lib/structured-data.ts`) har `BlogPosting` og en brødsmulesti
(`BreadcrumbList`: Hofstad.NET › Alle innlegg › tittelen), så søkeresultatene kan vise stien i stedet for adressen.

### Språk

Siden er på norsk (`lang="nb"`) på rot og på engelsk (`lang="en"`) under `/en/`, med adresser på sidens språk.

- **Tekster:** alle tekster i komponentene står i `src/i18n/nb.ts` og `src/i18n/en.ts`, med de samme nøklene. `t(lang)`
  i `src/i18n/index.ts` gir ordboken for et språk, og datoer og tall formateres med `nb-NO` eller `en-GB`.
  Skriptene i nettleseren leser språket fra `<html lang>` og henter tekstene fra de samme ordbøkene via
  `src/i18n/client.ts`, så ingen tekster ligger i HTML-attributter.
- **Adresser:** `src/i18n/urls.ts` gir adressene per sidetype og språk, og finner den samme siden på det andre
  språket. Den brukes også av nettstedskartet i `astro.config.mjs`.
- **Innlegg:** engelske versjoner ligger i `src/content/posts-en/` med samme filnavn, og har bare tittel, ingress,
  alt-tekst, stikkord og tekst. Resten hentes fra det norske innlegget (`getPosts` i `src/lib/posts.ts`). Engelske
  innlegg og lister finnes bare for oversatte innlegg.
- **Språkvelger:** «EN» eller «NO» ved siden av lys/mørk-knappen lenker til den samme siden på det andre språket.
  Uten oversettelse lenker den til arkivet (innlegg), oversikten over stikkord (enkeltstikkord) eller forsiden (404).
- **For søkemotorer:** sider med oversettelse har `<link rel="alternate" hreflang>` for `nb`, `en` og `x-default`
  (norsk), og `og:locale:alternate`. Nettstedskartet har de samme lenkene. Den strukturerte dataen har `inLanguage`.

### Søk

`npm run build` lager søkeindeksen i `dist/pagefind/` etter Astro-bygget. Bare innleggene indekseres
(`data-pagefind-body` i `src/components/pages/PostPage.astro`). Pagefind lager én indeks per språk ut fra
`<html lang>`, så søket på en engelsk side gir engelske innlegg, og søket på en norsk side norske. «Søk» i menyen åpner et panel med treff mens man skriver
(`src/scripts/search-panel.js`), og `/` åpner det fra tastaturet. Utdragene bygges som DOM-noder, ikke HTML, så søket
fungerer under Trusted Types.

## Beslutninger

Valg som binder siden for lengre tid, står som beslutningsnotater i [decisions/](decisions/README.md), med bakgrunn,
konsekvenser og alternativene som ble vurdert.

| Nr. | Beslutning |
|---|---|
| [0001](decisions/0001-cloudflare-workers.md) | Cloudflare Workers med statiske filer, ikke Cloudflare Pages eller GitHub Pages |
| [0002](decisions/0002-public-repository.md) | Offentlig repo |
| [0003](decisions/0003-opentofu.md) | OpenTofu for Cloudflare-sonen, ikke Terraform |
| [0004](decisions/0004-english-under-en.md) | Engelsk under `/en/`, med egen samling og uten videresending etter `Accept-Language` |
| [0005](decisions/0005-no-forms-or-cookies.md) | Ingen skjemaer og ingen informasjonskapsler |
| [0006](decisions/0006-logs-without-ip.md) | Logger uten IP og nettleserinfo |

### Videre utvikling

- **CMS:** et git-basert CMS (for eksempel Decap, Sveltia eller Keystatic) redigerer de samme Markdown-filene og
  åpner en pull request, uten endring i arkitekturen.
- **Database:** en ny innholdskilde (for eksempel Cloudflare D1) legges til som en ny «loader» i Astros innholdslag.
  Dynamiske funksjoner legges under `/api/` med bare de tilgangene de trenger.
