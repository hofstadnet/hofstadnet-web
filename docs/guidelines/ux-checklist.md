# UX- og tilgjengelighetssjekkliste

Gå gjennom punktene før pull requesten lages. Testene fanger mye, men ikke alt.

## Visning

- [ ] Endringen er sett i både mørk og lys visning, og når systemet bytter mellom dem.
- [ ] Endringen er sett på både norsk og engelsk (`/en/`). Engelsk tekst er ofte lengre, så sjekk at menyen og kort
      ikke brekker på 320 px.
- [ ] Siden fungerer på 320 px uten horisontal rulling, og på stor skjerm.
- [ ] Tekst har god kontrast i begge visninger (WCAG 2.2 AA). axe sjekker dette i testene.
- [ ] Bevegelse er slått av for dem som har bedt om mindre bevegelse (`prefers-reduced-motion`).

## Bruk

- [ ] Alt kan brukes med tastatur, med synlig fokus og logisk rekkefølge.
- [ ] Knapper og lenker har navn som gir mening uten sammenheng, og trykkflater på minst 24 × 24 px.
- [ ] Bilder har beskrivende alt-tekst, eller `alt=""` når de bare er pynt.
- [ ] Siden fungerer uten JavaScript, med en enklere løsning der det trengs.
- [ ] Tekst på siden er på riktig språk, og `lang` er satt når språket skifter.
- [ ] Nye tekster står i både `src/i18n/nb.ts` og `src/i18n/en.ts`, ikke i komponenten, i skriptet eller i
      `data-*`-attributter. Skript henter tekstene med `strings()` fra `src/i18n/client.ts`.
- [ ] Språkvelgeren lenker til den samme siden på det andre språket, eller til forsiden eller arkivet der når siden
      ikke er oversatt.

## Ytelse

- [ ] Nye bilder bruker `Picture` eller `Image` fra Astro med AVIF og WebP.
- [ ] Ytelsesbudsjettet i Lighthouse holder (se `docs/operations.md`).
- [ ] Ingen nye skrifter eller tunge skript uten god grunn.

## Skjermbilder

- [ ] Endrer endringen utseendet med vilje, er skjermbildene oppdatert etter fremgangsmåten i
      [docs/operations.md](../operations.md#endre-utseendet).
