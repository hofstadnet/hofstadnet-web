# Dokumentasjon

Dokumentasjonen beskriver hvordan siden er nå. Den oppdateres i samme pull request som endringen den gjelder.

## Fremgangsmåte

1. Se hva som er endret: `git diff --stat origin/main...HEAD` og selve diffen.
2. Finn dokumentene som berøres, med tabellen under, og les dem i sin helhet.
3. Kontroller hver påstand som berøres, mot koden eller innstillingene, ikke mot hukommelsen. Typiske kilder:
   `package.json`, `.github/workflows/`, `public/_headers`, `wrangler.jsonc`, `infra/hofstad.net/terraform.tfvars`,
   `lighthouserc.json`, `tests/`, og `gh api` for regelsett, miljøer og secrets.
4. Oppdater teksten etter skrivereglene under.
5. Kjør kontrollen av dokumentasjonen (se `docs/operations.md`). Den kjører også i bygget.

## Hvor ting er beskrevet

| Endring i | Oppdater |
|---|---|
| Kommandoer, mappestruktur, innholdsmodell, skriving av innlegg | `README.md` |
| Sider og adresser, Workeren, søk, flystatus | `docs/architecture.md` |
| Valg som binder siden for lengre tid | Nytt notat i `docs/decisions/`, og tabellen «Beslutninger» i `docs/architecture.md` |
| `public/_headers`, CSP, Trusted Types, Cloudflare-sonen, tokens og tilganger, regelsett, Dependabot | `docs/security.md`, og `SECURITY.md` når noe av det som står der endres |
| `.github/workflows/`, tester, grenser i Lighthouse, overvåking, varsler, fremgangsmåter | `docs/operations.md` |
| `infra/` | `infra/README.md`, og sonebeskrivelsen i `docs/security.md` |
| Hva siden samler inn eller sender til andre | Personvernsiden på begge språk («privacy» i `src/i18n/nb.ts` og `src/i18n/en.ts`) |
| Regler for hvordan arbeid gjøres | `docs/guidelines/`, og lenken i `AGENTS.md` |

En ny arbeidsflyt må inn i tabellen i `docs/operations.md`, ellers stopper kontrollen.

## Skriveregler

- Dokumentasjon og kommentarer skrives på norsk bokmål. `SECURITY.md` er på engelsk, fordi den leses av folk utenfra.
  Navn på filer, mapper og alt annet som er identifikatorer, er på engelsk (se [README.md](README.md#navngivning)).
- Beskriv hvordan det er, ikke hva som er gjort. Ingen datoer for når noe ble gjort, og ingen «nå», «nylig» eller
  «gjenstår». Historikken ligger i git.
- Nøytral form: «Kjør …», «Tokenet lages i …», ikke «du må» eller «jeg har». Bruk «eier» om personen som har
  tilgangene.
- Ingen private opplysninger: ingen private e-postadresser, lokale filstier, navn på andre personer, tokenverdier eller
  hemmeligheter. Konto- og sone-ID og offentlige DNS-poster er greit. E-postadresser ligger som secrets, ikke i
  repoet.
- Ingen omtale av tidligere løsninger eller leverandører som ikke lenger er i bruk.
- Stier, kommandoer, filnavn og verdier i `kode`. Kontrollen sjekker at stier i `kode` finnes.
- Korte avsnitt og tabeller. Én ting beskrives ett sted, og andre steder lenker dit.
- Figurer (dataflyt, flyt for endringer) tegnes med Mermaid i en ```` ```mermaid ````-blokk når de gjør teksten
  lettere å forstå. GitHub viser dem som figurer. Skriv én linje med sammendrag under hver figur, så dokumentet kan
  leses der Mermaid ikke vises. Stier i `kode` hører hjemme i teksten, ikke i figuren, fordi kontrollen hopper over
  kodeblokker.
