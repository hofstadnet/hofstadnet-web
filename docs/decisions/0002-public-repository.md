# 0002: Offentlig repo

- **Status:** Vedtatt

## Bakgrunn
Repoet ligger i organisasjonen hofstadnet på gratisplanen. Flere av sikkerhetsfunksjonene i GitHub finnes bare for
offentlige repoer på den planen.

## Beslutning
Repoet er offentlig. Det inneholder ingen hemmeligheter: tokens ligger som GitHub-secrets, og state for OpenTofu er
kryptert i R2.

## Konsekvenser
- Gratis CodeQL, dependency review, OpenSSF Scorecard, regelsett og miljøer med påkrevd godkjenning.
- Det som uansett er synlig, er offentlig: DNS-poster, konto- og sone-ID (gir ingen tilgang uten token), WAF-stier og
  grenser for rate limiting.
- Utkast (`draft: true`) er synlige som filer.
- Det som ikke skal være offentlig, holdes utenfor repoet: målet for Email Routing, IGC-filer og originalbilder med
  posisjonsdata.

## Alternativer som ble vurdert
**Privat repo:** skjuler utkast og oppsett, men mister flere av sikkerhetsfunksjonene over uten betalt plan.
