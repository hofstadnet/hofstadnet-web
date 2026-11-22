# Nytt innlegg

Feltene og komponentene er beskrevet i [README.md](../../README.md#skrive-et-innlegg).

1. Lag filen i innholdsmappen med et kort filnavn i små bokstaver og bindestrek. Filnavnet blir adressen og bør ikke
   endres etter publisering.
2. Velg område etter hva innlegget handler om. Innlegg om nettsider og digitale prosjekter hører til «Foran skjermen»,
   også når de handler om flyging.
3. Bruk `.mdx` bare når innlegget trenger video eller galleri.
4. Bilder:
   - legges i bildemappen og hentes med relativ sti
   - har beskrivende alt-tekst
   - har ikke posisjonsdata. Fjern EXIF med GPS før bildet sjekkes inn, siden repoet er offentlig.
5. Ingen personopplysninger om andre uten samtykke, og ingen bilder der andre er lette å kjenne igjen uten samtykke.
6. Sett `draft: true` til innlegget er klart. Filen er likevel synlig i det offentlige repoet.
7. Lag gjerne en engelsk versjon med samme filnavn i `src/content/posts-en/`, med engelsk tittel, ingress, alt-tekst,
   stikkord og tekst (se [README.md](../../README.md#engelsk-versjon-av-et-innlegg)). Uten den finnes innlegget bare
   på norsk, og engelske lister viser det ikke.
8. Kjør bygget og se innlegget med forhåndsvisningen før pull requesten lages. Pull requesten får også en egen
   forhåndsvisning fra Cloudflare.
