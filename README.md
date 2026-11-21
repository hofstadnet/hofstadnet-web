# hofstad.net

Kildekoden til [hofstad.net](https://hofstad.net): en statisk side bygget med [Astro](https://astro.build).
Forsiden viser et bilde fra arkivet, live-kart, lenker til profiler og de nyeste innleggene.

Status: siden bygger og er testet lokalt. Den er ikke publisert.

## Kom i gang

Du trenger Node.js 22 eller nyere.

```bash
npm install
```

```bash
npm run dev
```

| Kommando | Hva den gjør |
|---|---|
| `npm run dev` | Starter lokal utvikling med automatisk oppdatering. Utkast vises. |
| `npm run build` | Typesjekker og bygger den ferdige siden til `dist/`. |
| `npm run forhandsvis` | Viser `dist/` lokalt med de samme sikkerhetshodene som i drift, og svarer på `/api/status`. |
| `node scripts/sjekk-csp.mjs` | Kontrollerer at den bygde siden ikke har innebygd kode. |
| `npx wrangler deploy --dry-run` | Kontrollerer oppsettet for Cloudflare uten å publisere noe. |

### Windows med Smart App Control

Smart App Control blokkerer én usignert maskinkodefil i Astros Markdown-leser (`satteri`). Bygget feiler da med
«Cannot find native binding». Installer WebAssembly-utgaven lokalt, så brukes den automatisk:

```bash
npm install --no-save --force @bruits/satteri-wasm32-wasi@0.11.7
```

Versjonen må være den samme som `satteri` i `package-lock.json`. Pakken lagres ikke i `package.json`, fordi den bare
trengs på maskiner med denne beskyttelsen. Den må installeres på nytt etter `npm ci`.

## Publisering

Siden kjører på Cloudflare Workers med statiske filer. Cloudflare anbefaler Workers fremfor Pages for nye prosjekter.

- Statiske filer fra `dist/` leveres direkte av Cloudflare, uten at kode kjøres.
- `worker/index.js` kjøres bare for adresser under `/api/`.
- `public/_headers` og `public/_redirects` følger med i `dist/` og leses av Cloudflare.

Repoet er koblet til Cloudflare med Workers Builds. Hver endring som flettes inn i `main`, bygges med
`npm run build` og publiseres med `npx wrangler deploy`. Pull requests får en egen forhåndsvisning.

Domenene `hofstad.net` og `www.hofstad.net` er satt opp i `wrangler.jsonc`. `www` sendes videre til
`hofstad.net` med en videresendingsregel i Cloudflare-sonen.

## Skrive et innlegg

Lag en fil i `src/content/innlegg/`. Filnavnet blir adressen: `mitt-innlegg.md` får adressen `/innlegg/mitt-innlegg/`.

```markdown
---
tittel: "Tittelen"
ingress: "Én eller to setninger som vises på kort og øverst i innlegget."
publisert: 2026-12-01
omrader: [luft]
bilde: ../../assets/bilder/mitt-bilde.jpg
bildeAlt: "Hva bildet viser"
---

Teksten skrives i Markdown.
```

| Felt | Påkrevd | Forklaring |
|---|---|---|
| `tittel`, `ingress`, `publisert` | Ja | |
| `omrader` | Ja | Ett eller flere av `luft`, `natur`, `vann`, `foto-video`, `skjerm`. Det første vises på kort. |
| `type` | Nei | `innlegg` (standard), `notat`, `test`, `video` eller `prosjekt`. |
| `stikkord` | Nei | Liste med frie stikkord. |
| `bilde`, `bildeAlt` | Nei | Hovedbilde. Legg bildefilen i `src/assets/bilder/`. |
| `harVideo` | Nei | `true` gir avspillingsmerke på kort. |
| `oppdatert` | Nei | Dato for siste endring. |
| `utkast` | Nei | `true` skjuler innlegget fra den publiserte siden. |

Bygget stopper hvis et felt mangler, et område er ukjent eller et bilde ikke finnes.

### Video og bildegalleri

Innlegg som trenger video eller galleri, lagres som `.mdx`. Se
`src/content/innlegg/deltaker-i-foto-video-konk-2019.mdx` og `clug-roadie-mtb-sykkelstativ.mdx` for eksempler.

- **Video:** `<Video id="..." tittel="..." plakat={bilde} />`. Forhåndsvisningen er et lokalt bilde, og spilleren
  hentes fra YouTube eller Vimeo først når den besøkende trykker.
- **Galleri:** `<Galleri bilder={[...]} />`. Ett stort bilde med småbilder under, blaing og fullskjerm.

### Flystatistikk

Statistikken på siden «I lufta» regnes ut lokalt fra IGC-filene og lagres som summer i
`src/data/flystatistikk.json`. Kjør skriptet på nytt etter nye turer og sjekk inn JSON-filen:

```bash
npm run flystatistikk -- "D:\Root\Google Drive\Paragliding\Tracklog" --utelat " - (Ørjan|Erlend) \("
```

`--utelat` hopper over andres spor fra felles turer. IGC-filene sjekkes aldri inn, og JSON-filen inneholder
ingen spor, koordinater eller startsteder.

### Søk

Søket bruker [Pagefind](https://pagefind.app/). `npm run build` lager søkeindeksen i `dist/pagefind/` etter
Astro-bygget. Bare innleggene blir indeksert (`data-pagefind-body` i `src/pages/innlegg/[id].astro`), og søket
skjer helt i nettleseren.

## Mappestruktur

| Sti | Innhold |
|---|---|
| `src/content/innlegg/` | Innleggene, én fil per innlegg |
| `src/content.config.ts` | Innholdsmodellen som innleggene valideres mot |
| `src/lib/omrader.ts` | De fem områdene |
| `src/pages/` | Forside, innlegg, arkiv, områder, RSS, personvern og 404 |
| `src/components/`, `src/layouts/` | Byggeklossene sidene er satt sammen av |
| `src/styles/`, `src/scripts/` | Stilark og skript |
| `src/assets/bilder/` | Bilder som optimaliseres ved bygg |
| `public/` | Filer som kopieres uendret: ikoner, logo, `_headers`, `_redirects` |
| `worker/index.js` | Statustjenesten som spør LiveTrack24 om sporingen er aktiv. Kjøres bare for `/api/`. |
| `wrangler.jsonc` | Oppsett for Cloudflare Workers med statiske filer |
| `.github/` | Arbeidsflyter for bygg og sikkerhetssjekker |
| `docs/` | [Arkitektur, sikkerhet og beslutninger](docs/arkitektur.md) |

## Sikkerhet

- Skrift, ikoner, bilder og skript ligger i repoet. Siden fungerer selv om andre tjenester er nede.
- `public/_headers` setter en streng Content-Security-Policy uten innebygd kode. Unntakene er videorammer
  fra YouTube og Vimeo, som lastes først når den besøkende trykker på spill av, og skriptet til Cloudflare Web
  Analytics. `'wasm-unsafe-eval'` er med fordi søket kjører WebAssembly fra siden selv.
- Cloudflare-sonen har DNSSEC, CAA-poster (bare Let's Encrypt, Google og SSL.com kan utstede sertifikater),
  DMARC med `p=reject` (domenet sender ikke e-post), rate limiting på `/api/status`, en WAF-regel som blokkerer
  WordPress- og skannerforsøk (`.php`, `/wp-admin`, `/.env`, `/.git`), Bot Fight Mode og blokkering av KI-roboter.
- Flystatus hentes av sidens egen tjeneste (`/api/status`), så besøkende kontakter ikke LiveTrack24 før de åpner
  kartet. Tjenesten tar ingen parametere og har ingen hemmeligheter.
- Lys eller mørk visning lagres bare lokalt i nettleseren. Siden bruker ingen informasjonskapsler.
- `public/_redirects` sender adressene fra den gamle WordPress-siden videre til de nye.

## Overvåking

- **Besøk og lastetid:** Cloudflare Web Analytics (anonyme tall, ingen informasjonskapsler). Sidevisninger, kilder
  og Core Web Vitals ligger under Analytics & Logs → Web Analytics.
- **Workeren (`/api/`):** logger, sporing (traces) og feilgruppering (issues) er slått på i `wrangler.jsonc`. Se
  Workers & Pages → hofstadnet-web → Observability.
- **Sertifikater:** Cloudflare varsler admin@ når det utstedes et nytt sertifikat for hofstad.net
  (Certificate Transparency). Uventede sertifikater kan tyde på at noen prøver å utgi seg for siden.

Sikkerhetsfeil rapporteres via «Report a vulnerability» under Security-fanen i repoet. Se [SECURITY.md](SECURITY.md).

## Lisens

Koden er lisensiert under MIT, se [LICENSE](LICENSE). Det gjelder komponenter, stilark, skript, workeren,
byggeskript og arbeidsflyter.

Innholdet er ikke omfattet av MIT-lisensen. Alle rettigheter er forbeholdt for:

- bildene i `src/assets/bilder/`
- innleggene i `src/content/innlegg/`
- logoen og ikonene med Hofstad.NET-merket i `public/`, `public/assets/logo/` og delingsbildet
  `public/og-image-1200x630.png`

© Kristoffer D. Hofstad. Skjermbildene av hpgt.com og flysteder.hpgt.com inneholder bilder fra Harstad Hang og
Paragliderklubbs bildesamling, og rettighetene til dem tilhører klubben og fotografene.

Skriften Barlow Semi Condensed hentes fra npm ved bygg og er lisensiert under SIL Open Font License 1.1.
