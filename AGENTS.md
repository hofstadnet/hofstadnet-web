# AGENTS.md

Instruksjoner for kodeagenter og andre som jobber i repoet. Beskrivelsen av prosjektet står i [README.md](README.md).

## Prosjektet

Kildekoden til hofstad.net: en statisk side i Astro, levert av Cloudflare Workers, med én Worker for `/api/` og
Cloudflare-sonen som kode i `infra/` (OpenTofu).

## Kommandoer

| Kommando | Når |
|---|---|
| `npm ci` | Etter kloning og etter endringer i `package-lock.json` |
| `npm run build` | Før hver pull request. Typesjekker og bygger. |
| `npm run test:tilgjengelighet` | Etter endringer i sider, komponenter, stilark, skript eller Workeren |
| `node scripts/sjekk-dokumentasjon.mjs` | Etter endringer i dokumentasjon, arbeidsflyter eller filstruktur |

## Regler

- Følg [retningslinjene](docs/guidelines/README.md): navngivning, dokumentasjon, sikkerhet, UX og nye innlegg.
- Alle endringer går via pull request med grønne sjekker. Ikke push til `main`.
- Oppdater dokumentasjonen i samme pull request som endringen ([documentation.md](docs/guidelines/documentation.md)).
- Endringer i Cloudflare gjøres i `infra/`, aldri i dashbordet.
- Ingen hemmeligheter, tokens eller private opplysninger i repoet. Repoet er offentlig.
- Content-Security-Policy tillater ikke innebygd kode, og Trusted Types stopper `innerHTML` o.l.
