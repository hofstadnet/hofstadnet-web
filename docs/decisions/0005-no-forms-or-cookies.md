# 0005: Ingen skjemaer og ingen informasjonskapsler

- **Status:** Vedtatt

## Bakgrunn
Siden er en personlig blogg med én forfatter. Skjemaer og informasjonskapsler gir mer angrepsflate, mer personvern å
forklare og krav om samtykke, uten at siden trenger dem.

## Beslutning
- Siden har ingen skjemaer som sender data utenfor siden. Søket skjer i nettleseren, og søkefeltet på 404-siden
  sender bare til `/sok/`.
- Siden setter ingen informasjonskapsler. Valget av lys eller mørk visning lagres bare lokalt i nettleseren, og
  språket velges med adressen.
- Ingen database, innlogging eller adminpanel.

## Konsekvenser
- Ingen samtykkebanner, og personvernsiden er kort.
- Workeren tar ikke imot innhold fra besøkende, bortsett fra CSP-rapporter fra nettleseren, som er begrenset i
  størrelse og logges uten personopplysninger (se [docs/security.md](../security.md#rapporter-om-brudd)).
- Et skjema eller en informasjonskapsel krever en ny beslutning som erstatter denne.

## Alternativer som ble vurdert
**Kontaktskjema:** krever robotsjekk, rate limiting og et sted å lagre innsendinger, og gir lite for en personlig
blogg.
