# 0004: Engelsk under /en/, med egen samling og uten videresending etter Accept-Language

- **Status:** Vedtatt

## Bakgrunn
Siden skal finnes på engelsk i tillegg til norsk, uten å endre de norske adressene og uten skript eller
informasjonskapsler for å velge språk.

## Beslutning
- Norsk er hovedspråket og beholder adressene på rot. Engelsk ligger under `/en/` med engelske adresser.
- De engelske innleggene er en egen samling (`src/content/posts-en/`) med samme filnavn som de norske, ikke felt i de
  norske filene.
- Siden sender ikke videre ut fra `Accept-Language`. Adressen alene bestemmer språket.

## Konsekvenser
- Lenker, Upptime-sjekker og videresendinger i `public/_redirects` er uendret.
- Hver fil er et vanlig innlegg på ett språk, et innlegg kan stå uten oversettelse, og datoer, bilder og områder
  skrives bare ett sted.
- Språket virker likt for alle, også for søkemotorer og lenker som deles, og det trengs verken Worker for sidene eller
  informasjonskapsler.
- Engelske lister viser bare oversatte innlegg.

## Alternativer som ble vurdert
- **Eget domene eller underdomene:** mer oppsett i Cloudflare for én forfatter.
- **Samme adresser med språkvalg i nettleseren:** krever skript eller informasjonskapsler, og søkemotorer ser bare
  ett språk.
- **Engelske felt i de norske filene:** blander språkene i én fil og gjør innlegg uten oversettelse vanskeligere.
