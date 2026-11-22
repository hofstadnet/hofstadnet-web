# UX- og tilgjengelighetssjekkliste

Gå gjennom punktene før pull requesten lages. Testene fanger mye, men ikke alt.

## Visning

- [ ] Endringen er sett i både mørk og lys visning, og når systemet bytter mellom dem.
- [ ] Siden fungerer på 320 px uten horisontal rulling, og på stor skjerm.
- [ ] Tekst har god kontrast i begge visninger (WCAG 2.2 AA). axe sjekker dette i testene.
- [ ] Bevegelse er slått av for dem som har bedt om mindre bevegelse (`prefers-reduced-motion`).

## Bruk

- [ ] Alt kan brukes med tastatur, med synlig fokus og logisk rekkefølge.
- [ ] Knapper og lenker har navn som gir mening uten sammenheng, og trykkflater på minst 24 × 24 px.
- [ ] Bilder har beskrivende alt-tekst, eller `alt=""` når de bare er pynt.
- [ ] Siden fungerer uten JavaScript, med en enklere løsning der det trengs.
- [ ] Tekst på siden er på riktig språk, og `lang` er satt når språket skifter.

## Ytelse

- [ ] Nye bilder bruker `Picture` eller `Image` fra Astro med AVIF og WebP.
- [ ] Ytelsesbudsjettet i Lighthouse holder (se `docs/operations.md`).
- [ ] Ingen nye skrifter eller tunge skript uten god grunn.

## Skjermbilder

- [ ] Endrer endringen utseendet med vilje, er skjermbildene oppdatert etter fremgangsmåten i
      [docs/operations.md](../operations.md#endre-utseendet).
