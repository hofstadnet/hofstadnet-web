# Gjennomgang av arkitektur

Prinsippene og den generelle sjekklisten står i
[hofstadnet/guidelines: architecture.md](https://github.com/hofstadnet/guidelines/blob/main/architecture.md).
Her står det som er spesielt for hofstad.net. Beskrivelsen av arkitekturen er [docs/architecture.md](../architecture.md).

Gå gjennom punktene når en endring legger til, fjerner eller bytter en komponent, tjeneste, avhengighet eller dataflyt.

## Rammer for siden

- [ ] Siden er fortsatt statiske filer fra `dist/`. Ny serverlogikk legges som en adresse under `/api/` i Workeren,
      ikke som en egen tjeneste.
- [ ] Ingen database, innlogging, informasjonskapsler eller adminpanel.
- [ ] Besøkende kontakter ikke tredjeparter før de selv ber om det. Unntaket er Cloudflare Web Analytics.
- [ ] Eksterne data hentes av Workeren med fast adresse, mellomlagres og tåler at kilden er nede.
- [ ] Sider fungerer uten JavaScript. Søk og galleri har en enklere løsning uten skript.
- [ ] Adresser på siden er på sidens språk og endres ikke: norske på rot, engelske under `/en/`. Gamle adresser
      sendes videre i `public/_redirects`.

## Dokumentasjon

- [ ] Tabellen «Oversikt», figuren «Dataflyt» og «Komponenter» i `docs/architecture.md` stemmer.
- [ ] Nye adresser står i adressetabellen.
- [ ] Et valg som binder siden for lengre tid (plattform, rammeverk, ny tjeneste), har et nytt beslutningsnotat i
      `docs/decisions/` etter `docs/decisions/template.md`, med alternativene som ble vurdert, og står i tabellen
      «Beslutninger» i `docs/architecture.md`. En beslutning som endres, erstattes av en ny.
- [ ] Nye tjenester og tredjeparter står i `docs/security.md` og på personvernsiden.

## Etter endringen

- [ ] Ytelsesbudsjettet og testene er grønne (se [testing.md](testing.md)).
- [ ] Endringen kan rulles tilbake med `git revert`, og eventuelt med apply av `infra/`.
