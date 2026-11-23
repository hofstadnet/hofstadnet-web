# Testing

Testlagene og de generelle reglene står i
[hofstadnet/guidelines: testing.md](https://github.com/hofstadnet/guidelines/blob/main/testing.md). Her står hvordan
det er satt opp i hofstad.net. Arbeidsflytene og grensene er beskrevet i [docs/operations.md](../operations.md).

## Hva som testes hvor

| Lag | Her | Kommando |
|---|---|---|
| Enhetstester | `tests/unit/`: tolkingen av LiveTrack24, IGC-analysen for flystatistikken, og logglinjene og størrelsesgrensen i Workeren | `npm run test:unit` |
| Statisk kontroll | `astro check` (typer og innholdsmodell), `tofu validate`, zizmor | `npm run build` |
| Bygg-kontroller | Ingen innebygd kode, gyldig `security.txt`, dokumentasjonen | `node scripts/check-csp.mjs`, `node scripts/check-security-txt.mjs`, `node scripts/check-docs.mjs` |
| Ende-til-ende og tilgjengelighet | `tests/accessibility.spec.ts`: alle sider i nettstedskartet, mørk og lys, 320 og 1280 px, CSP-brudd og JavaScript-feil, søk, galleri og `/api/csp` | `npm run test:e2e` |
| Visuelle tester | `tests/visual.spec.ts` og `tests/screenshots/` (bare Linux) | `npm run test:e2e` i CI |
| Ytelse | `lighthouserc.json` med poenggrenser og ytelsesbudsjett | `npm run test:lighthouse` |
| Infrastruktur | Planen på pull requesten | `infra.yml` |
| Produksjon | Lighthouse og ende-til-ende mot hofstad.net | `production.yml`, mandager |

Testene kjører mot det ferdige bygget med de samme sikkerhetshodene som i drift (`scripts/preview.mjs`). Kjør
`npm run build` før testene.

## Regler for repoet

- [ ] Ny side eller ny adresse kommer automatisk med i tilgjengelighetstestene via nettstedskartet. Sjekk at den er
      med.
- [ ] Nytt skript i nettleseren testes i `tests/accessibility.spec.ts` med en test som bruker det, så brudd på
      Trusted Types og CSP oppdages.
- [ ] Ny adresse under `/api/` får en test av metoder og statuskoder, på samme måte som `/api/csp`.
- [ ] Flystatusen fra LiveTrack24 dekkes til i skjermbildene, og testene tåler at tjenesten er nede.
- [ ] Endret utseende med vilje gir nye skjermbilder etter fremgangsmåten i
      [docs/operations.md](../operations.md#endre-utseendet).
- [ ] Ny logikk uten nettleser (for eksempel tolking i `src/lib/` eller utregning i `scripts/`) får enhetstester i
      `tests/unit/`, med Node sin testkjører og uten nettverk. Logikk som ligger inne i et skript, flyttes ut i en
      modul med rene funksjoner (som `scripts/lib/igc.mjs`), så den kan testes.
