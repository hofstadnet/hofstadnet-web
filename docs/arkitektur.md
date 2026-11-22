# Arkitektur

Hvordan hofstad.net er satt sammen, og hvorfor. Sikkerhet er beskrevet i [sikkerhet.md](sikkerhet.md), og drift i
[drift.md](drift.md).

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

## Dataflyt

```
Besøkende ──► Cloudflare (DNS, TLS, WAF, rate limiting, DDoS)
                 ├── statiske filer fra dist/ (HTML, CSS, JS, bilder, søkeindeks)
                 ├── /api/status ──► Worker ──► LiveTrack24 (offentlig statusrute, mellomlagret 60 s)
                 └── /api/csp    ──► Worker ──► Workers Logs (anonymiserte rapporter)

Nettleseren ──► static.cloudflareinsights.com / cloudflareinsights.com (Web Analytics, uten informasjonskapsler)

Endring: pull request ──► GitHub Actions (bygg, tester, sikkerhet, plan) ──► merge til main
         ├── Workers Builds bygger og publiserer siden
         └── infra.yml kjører OpenTofu apply etter godkjenning, hvis infra/ er endret
```

## Komponenter

### Statiske sider

Astro bygger alle sider til `dist/` ved `npm run build`. Cloudflare leverer filene direkte uten å kjøre kode.
`public/_headers` setter sikkerhetshoder og mellomlagring, og `public/_redirects` sender eldre adresser videre til de
nye.

Adresser:

| Adresse | Innhold |
|---|---|
| `/` | Forside med flystatus, lenker og nyeste innlegg |
| `/innlegg/` og `/innlegg/<filnavn>/` | Arkiv og innlegg |
| `/omrade/<id>/` | Innlegg per område. «I lufta» har også flystatistikk. |
| `/stikkord/` og `/stikkord/<stikkord>/` | Innlegg per stikkord |
| `/sok/` | Søk uten JavaScript, brukt av 404-siden og søkefeltet i Google |
| `/personvern/` | Hva siden samler inn |
| `/rss.xml`, `/sitemap-index.xml` | RSS med hele innleggene, og nettstedskart med `lastmod` |

### Worker (`worker/`)

Workeren kjøres bare for adresser under `/api/` (`run_worker_first` i `wrangler.jsonc`) og svarer bare på
hofstad.net og www.hofstad.net. `workers_dev` er slått av.

- **`GET /api/status`** svarer med `live`, `ikke-live` eller `ukjent` ut fra LiveTrack24 sin offentlige statusrute.
  Svaret mellomlagres i 60 sekunder, så besøk blir ikke til trafikk mot LiveTrack24. Tolkingen ligger i
  `src/lib/livetrack-status.js`. Ukjente svar logges, og siden viser da en nøytral tekst.
- **`POST /api/csp`** tar imot rapporter når nettleseren stopper noe på grunn av Content-Security-Policy eller
  Trusted Types (`worker/csp-rapport.js`). Se [sikkerhet.md](sikkerhet.md#rapporter-om-brudd).

Workeren har ingen hemmeligheter og tar ingen parametere. Begge adressene har rate limiting i Cloudflare.

### Flystatus og flystatistikk

- **Status nå:** forsiden henter `/api/status` og viser «I lufta nå» når sporingen hos LiveTrack24 er aktiv.
  Live-kartet åpnes hos LiveTrack24 i ny fane. Besøkende kontakter ikke LiveTrack24 før de åpner kartet.
- **Siste tur og statistikk:** regnes ut lokalt fra IGC-filer med `npm run flystatistikk` og lagres som summer i
  `src/data/flystatistikk.json`. Filen inneholder ingen spor eller koordinater.

pgpilot.app brukes som vanlig lenke. Tjenesten har ikke noe offentlig API for live-status, og siden kan ikke bygges
inn (`X-Frame-Options: DENY`).

### Innholdsmodell

Hvert innlegg er én Markdown- eller MDX-fil i `src/content/innlegg/`, validert mot `src/content.config.ts` ved bygg.
Feltene er beskrevet i [README](../README.md#skrive-et-innlegg). Innleggene sorteres på tre måter:

- **Område** svarer på «hva handler det om»: I lufta, Ute i naturen, Under overflaten, Bak kameraet og Foran
  skjermen. ID-ene (`luft`, `natur`, `vann`, `foto-video`, `skjerm`) er faste og brukes i adresser. Navnene endres i
  `src/lib/omrader.ts`. Innlegg om nettsider hører til «Foran skjermen», også når de handler om flyging.
- **Type** svarer på «hva slags innhold»: innlegg, notat, test, video eller prosjekt.
- **Stikkord** er frie, gir egne sider og brukes til «Les også».

### Søk

`npm run build` lager søkeindeksen i `dist/pagefind/` etter Astro-bygget. Bare innleggene indekseres
(`data-pagefind-body` i `src/pages/innlegg/[id].astro`). «Søk» i menyen åpner et panel med treff mens man skriver
(`src/scripts/sokepanel.js`), og `/` åpner det fra tastaturet. Utdragene bygges som DOM-noder, ikke HTML, så søket
fungerer under Trusted Types.

## Beslutninger

### Cloudflare Workers, ikke GitHub Pages eller Cloudflare Pages

GitHub Pages bak Cloudflare ville latt `*.github.io` svare direkte på internett, forbi WAF og DDoS-vern, og har ingen
serverdel for flystatusen. Cloudflare anbefaler Workers med statiske filer fremfor Pages for nye prosjekter. Med
Workers finnes det ingen origin å beskytte, og statiske filer og API ligger på samme plattform.

### Offentlig repo

Repoet inneholder ingen hemmeligheter. Tokens ligger som GitHub-secrets, og state for OpenTofu er kryptert i R2. Et
offentlig repo gir gratis CodeQL, dependency review, Scorecard, regelsett og miljøer med påkrevd godkjenning. På
gratisplanen for organisasjoner mangler flere av disse i private repoer.

Dette er offentlig fordi det uansett er synlig: DNS-poster, konto- og sone-ID (gir ingen tilgang uten token), WAF-
stier og grenser for rate limiting. Utkast (`utkast: true`) er synlige som filer. Det som ikke skal være offentlig,
holdes utenfor repoet. Det gjelder blant annet videresendingen i Email Routing, IGC-filer og originalbilder med
posisjonsdata.

### OpenTofu, ikke Terraform

Åpen lisens (MPL-2.0) og innebygd kryptering av state. Språket og Cloudflare-provideren er de samme som for
Terraform. Detaljer i [infra/README.md](../infra/README.md).

### Videre utvikling

- **CMS:** et git-basert CMS (for eksempel Decap, Sveltia eller Keystatic) redigerer de samme Markdown-filene og
  åpner en pull request, uten endring i arkitekturen.
- **Database:** en ny innholdskilde (for eksempel Cloudflare D1) legges til som en ny «loader» i Astros innholdslag.
  Dynamiske funksjoner legges under `/api/` med bare de tilgangene de trenger.
