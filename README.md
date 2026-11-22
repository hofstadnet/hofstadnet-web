# hofstad.net

Kildekoden til [hofstad.net](https://hofstad.net): en statisk side bygget med [Astro](https://astro.build) og
levert av Cloudflare Workers. Forsiden viser flystatus, lenker til profiler og de nyeste innleggene.

| Dokument | Innhold |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Komponenter, dataflyt og beslutninger |
| [docs/security.md](docs/security.md) | Sikkerhetsmodell: hoder, Cloudflare, tilganger og forsyningskjede |
| [docs/operations.md](docs/operations.md) | Publisering, arbeidsflyter, overvåking og fremgangsmåter |
| [infra/README.md](infra/README.md) | Cloudflare-oppsettet som kode (OpenTofu) |
| [SECURITY.md](SECURITY.md) | Rapportering av sårbarheter |
| [docs/guidelines/](docs/guidelines/README.md) | Retningslinjer: navngivning, dokumentasjon, sikkerhet, UX og nye innlegg |
| [AGENTS.md](AGENTS.md) | Instruksjoner for kodeagenter. `CLAUDE.md` henter den samme filen. |

## Kom i gang

Krever Node.js i versjonen fra `.nvmrc` (minst 22).

```bash
npm ci
```

```bash
npm run dev
```

| Kommando | Hva den gjør |
|---|---|
| `npm run dev` | Lokal utvikling med automatisk oppdatering. Utkast vises. |
| `npm run build` | Typesjekker, bygger siden til `dist/` og lager søkeindeksen. |
| `npm run preview` | Viser `dist/` med de samme sikkerhetshodene som i drift, og svarer på `/api/`. |
| `npm run test:e2e` | Playwright: tilgjengelighet, CSP, søk, galleri, `/api/csp` og skjermbilder. |
| `npm run test:lighthouse` | Lighthouse med poenggrenser og ytelsesbudsjett. |
| `npm run flight-stats` | Regner ut flystatistikken fra IGC-filer (se under). |
| `node scripts/check-csp.mjs` | Kontrollerer at den bygde siden ikke har innebygd kode. |
| `node scripts/check-docs.mjs` | Kontrollerer at stier, kommandoer og arbeidsflyter i dokumentasjonen finnes. |

Testene trenger Chromium én gang: `npx playwright install chromium`. Skjermbildetestene kjører bare på Linux, fordi
skrift tegnes ulikt på andre systemer.

### Windows med Smart App Control

Smart App Control blokkerer en usignert maskinkodefil i Astros Markdown-leser (`satteri`), og bygget feiler med
«Cannot find native binding». WebAssembly-utgaven brukes automatisk hvis den er installert:

```bash
npm install --no-save --force @bruits/satteri-wasm32-wasi@0.11.7
```

Versjonen må være den samme som `@bruits/satteri-*` i `package-lock.json`. Pakken lagres ikke i `package.json` og må
installeres på nytt etter `npm ci`.

## Skrive et innlegg

Lag en fil i `src/content/posts/`. Filnavnet blir adressen: `mitt-innlegg.md` blir `/innlegg/mitt-innlegg/`.

```markdown
---
title: "Tittelen"
summary: "Én eller to setninger som vises på kort og øverst i innlegget."
published: 2026-12-01
areas: [luft]
image: ../../assets/images/mitt-bilde.jpg
imageAlt: "Hva bildet viser"
---

Teksten skrives i Markdown.
```

| Felt | Påkrevd | Forklaring |
|---|---|---|
| `title`, `summary`, `published` | Ja | Tittel, ingress og publiseringsdato. |
| `areas` | Ja | Ett eller flere av `luft`, `natur`, `vann`, `foto-video`, `skjerm`. Det første vises på kort. |
| `type` | Nei | `post` (standard), `note`, `review`, `video` eller `project`. Vises på innlegget som «notat», «test», «video» eller «prosjekt» (`typeLabels` i `src/lib/posts.ts`). |
| `tags` | Nei | Frie stikkord. Hvert får en side under `/stikkord/`, og innlegg med felles stikkord vises under «Les også». |
| `image`, `imageAlt` | Nei | Hovedbilde i `src/assets/images/`. |
| `imageFocus` | Nei | Utsnitt i små bilder: `center` (standard), `left`, `right`, `top` eller `bottom`. |
| `hasVideo` | Nei | `true` gir avspillingsmerke på kort. |
| `updated` | Nei | Dato for siste endring. Brukes også i nettstedskartet. |
| `draft` | Nei | `true` holder innlegget utenfor den publiserte siden. Filen er likevel synlig i det offentlige repoet. |

Bygget stopper hvis et påkrevd felt mangler, et område er ukjent eller et bilde ikke finnes.

### Video og bildegalleri

Innlegg med video eller galleri lagres som `.mdx`. Eksempler: `src/content/posts/deltaker-i-foto-video-konk-2019.mdx`
og `src/content/posts/clug-roadie-mtb-sykkelstativ.mdx`.

- **Video:** `<Video id="..." title="..." poster={image} />`. Forhåndsvisningen er et lokalt bilde. Spilleren hentes
  fra YouTube eller Vimeo først når den besøkende trykker.
- **Galleri:** `<Gallery images={[{ src, alt, caption }]} />`. Ett stort bilde med småbilder under, blaing og
  fullskjerm.

### Flystatistikk

Statistikken på «I lufta» og «Siste tur» på forsiden regnes ut lokalt fra IGC-filer og lagres som summer i
`src/data/flight-stats.json`. Kjør skriptet etter nye turer og sjekk inn JSON-filen:

```bash
npm run flight-stats -- "<mappe med IGC-filer>" --exclude "<navn>,<navn>"
```

- Flere mapper kan gis etter hverandre. Samme tur i flere mapper telles én gang.
- `--exclude` hopper over spor fra andre piloter i felles mapper.
- IGC-filer sjekkes aldri inn, og JSON-filen inneholder ingen spor, koordinater eller startsteder.

## Mappestruktur

| Sti | Innhold |
|---|---|
| `src/content/posts/` | Innleggene, én fil per innlegg |
| `src/content.config.ts` | Innholdsmodellen innleggene valideres mot |
| `src/pages/` | Forside, innlegg, arkiv, områder, stikkord, søk, RSS, personvern og 404. Filnavnene følger adressene. |
| `src/components/`, `src/layouts/` | Byggeklossene sidene er satt sammen av |
| `src/lib/` | Områder, hjelpefunksjoner for innlegg, strukturert data og tolking av flystatus |
| `src/scripts/`, `src/styles/` | Skript og stilark |
| `src/assets/images/` | Bilder som optimaliseres ved bygg |
| `src/data/` | Flystatistikk |
| `public/` | Filer som kopieres uendret, blant annet `_headers`, `_redirects` og `.well-known/security.txt` |
| `worker/` | Workeren for `/api/status` og `/api/csp` |
| `wrangler.jsonc` | Oppsett for Cloudflare Workers |
| `infra/` | Cloudflare-sonen som kode (OpenTofu) |
| `tests/` | Playwright-tester og godkjente skjermbilder |
| `scripts/` | Forhåndsvisning, flystatistikk og kontroller som kjøres i bygget |
| `.github/` | Arbeidsflyter, Dependabot og CODEOWNERS |

## Lisens

Koden er lisensiert under MIT, se [LICENSE](LICENSE). Det gjelder komponenter, stilark, skript, workeren,
infrastrukturkoden, byggeskript og arbeidsflyter.

Innholdet er ikke omfattet av MIT-lisensen. Alle rettigheter er forbeholdt for:

- bildene i `src/assets/images/`
- innleggene i `src/content/posts/`
- logoen og ikonene med Hofstad.NET-merket i `public/`, `public/assets/logo/` og delingsbildet
  `public/og-image-1200x630.png`

© Kristoffer D. Hofstad. Skjermbildene av hpgt.com og flysteder.hpgt.com inneholder bilder fra Harstad Hang og
Paragliderklubbs bildesamling, og rettighetene til dem tilhører klubben og fotografene.

Skriften Barlow Semi Condensed hentes fra npm ved bygg og er lisensiert under SIL Open Font License 1.1.
