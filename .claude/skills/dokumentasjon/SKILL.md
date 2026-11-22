---
name: dokumentasjon
description: Holder dokumentasjonen i hofstadnet-web i takt med koden. Bruk den før en pull request som endrer kode, arbeidsflyter, infra/, wrangler.jsonc, public/_headers, tester eller avhengigheter, og når noen ber om å gå gjennom eller oppdatere dokumentasjonen.
---

# Oppdatere dokumentasjonen

Dokumentasjonen beskriver hvordan siden er nå. Den skal være riktig etter hver pull request, ikke ryddes opp senere.

## Fremgangsmåte

1. Se hva som er endret: `git diff --stat origin/main...HEAD` og selve diffen.
2. Finn dokumentene som berøres, med tabellen under. Les dem i sin helhet, ikke bare avsnittet som ser relevant ut.
3. Kontroller hver påstand som berøres, mot koden eller innstillingene, ikke mot hukommelsen. Typiske kilder:
   `package.json`, `.github/workflows/*.yml`, `public/_headers`, `wrangler.jsonc`, `infra/hofstad.net/terraform.tfvars`,
   `lighthouserc.json`, `tests/`, og `gh api` for regelsett, miljøer og secrets.
4. Oppdater teksten etter skrivereglene under.
5. Kjør `node scripts/sjekk-dokumentasjon.mjs`. Den må være grønn. Den kjører også i bygget.
6. Ta dokumentasjonen med i samme pull request som endringen.

## Hvor ting er beskrevet

| Endring i | Oppdater |
|---|---|
| Kommandoer, mappestruktur, innholdsmodell (`src/content.config.ts`), skriving av innlegg | `README.md` |
| Sider og adresser, Workeren, søk, flystatus, beslutninger | `docs/arkitektur.md` |
| `public/_headers`, CSP, Trusted Types, Cloudflare-sonen, tokens og tilganger, regelsett, Dependabot | `docs/sikkerhet.md`, og `SECURITY.md` hvis noe av det som står der endres |
| `.github/workflows/`, tester, grenser i Lighthouse, overvåking, varsler, fremgangsmåter | `docs/drift.md` |
| `infra/` | `infra/README.md`, og sonebeskrivelsen i `docs/sikkerhet.md` |
| Hva siden samler inn eller sender til andre | `src/pages/personvern.astro` |

En ny arbeidsflyt må inn i tabellen i `docs/drift.md`, ellers stopper kontrollen.

## Skriveregler

- Norsk bokmål. `SECURITY.md` er på engelsk, fordi den leses av folk utenfra.
- Beskriv hvordan det er, ikke hva som er gjort. Ingen datoer for når noe ble gjort, ingen «nå», «nylig» eller «gjenstår».
  Historikken ligger i git.
- Nøytral form, ikke personlig: «Kjør …», «Tokenet lages i …», ikke «du må» eller «jeg har». Bruk «eier» om personen som
  har tilgangene.
- Ingen private opplysninger: ingen private e-postadresser, lokale filstier, navn på andre personer, tokenverdier eller
  hemmeligheter. Konto- og sone-ID, offentlige DNS-poster og admin@hofstad.net er greit.
- Sti, kommando, filnavn og verdier i `kode`. Kontrollen sjekker at stier i `kode` finnes.
- Korte avsnitt og tabeller fremfor lange lister. Én ting beskrives ett sted, andre steder lenker dit.
