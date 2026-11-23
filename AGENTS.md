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
| `npm run test:unit` | Etter endringer i `src/lib/` eller `scripts/` |
| `npm run test:e2e` | Etter endringer i sider, komponenter, stilark, skript eller Workeren |
| `node scripts/check-docs.mjs` | Etter endringer i dokumentasjon, arbeidsflyter eller filstruktur |

## Regler

- Følg [retningslinjene](docs/guidelines/README.md): navngivning, dokumentasjon, sikkerhet, UX, arkitektur, testing og
  nye innlegg. De bygger på de felles retningslinjene i https://github.com/hofstadnet/guidelines.
- Alle endringer går via pull request med grønne sjekker. Ikke push til `main`.
- Oppdater dokumentasjonen i samme pull request som endringen ([documentation.md](docs/guidelines/documentation.md)).
- Endringer i Cloudflare gjøres i `infra/`, aldri i dashbordet.
- Ingen hemmeligheter, tokens eller private opplysninger i repoet. Repoet er offentlig.
- Content-Security-Policy tillater ikke innebygd kode, og Trusted Types stopper `innerHTML` o.l.
- Logger fra Workeren har aldri IP, nettleserinfo, spørrestrenger eller innhold fra forespørselen
  ([docs/security.md](docs/security.md#logger)).
- Arbeidsflyter: actions låst til SHA med versjonen i en kommentar, minst mulig `permissions`, og tokenet som kan
  endre Cloudflare, bare i miljøet `cloudflare`.
- Valg som binder siden for lengre tid, får et beslutningsnotat i [docs/decisions/](docs/decisions/README.md).
- Overvåking som gjelder flere repoer (revisjon av innstillinger, sertifikater, utløp), ligger i
  [hofstadnet/operations](https://github.com/hofstadnet/operations), ikke her.
