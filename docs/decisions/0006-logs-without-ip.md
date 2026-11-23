# 0006: Logger uten IP og nettleserinfo

- **Status:** Vedtatt

## Bakgrunn
Workeren trenger logger for å se at `/api/status` og `/api/csp` virker, og for å gi varsel om nye brudd på
Content-Security-Policy. Cloudflares egen logg per kall tar med IP-adresse, nettleserinfo og hele adressen, og
sporingen (traces) tar med nettleserinfo, hele adressen med spørrestreng og flere hoder fra forespørselen.

## Beslutning
- `invocation_logs` og `traces` er slått av i `wrangler.jsonc`.
- Workeren skriver én linje per kall med bare faste verdier fra koden, for eksempel
  `api path=/api/status status=200 result=not-live cache=hit`.
- Brudd på CSP logges med `console.error`, uten IP, nettleserinfo, spørrestrenger og kodeutdrag, så en ny type brudd
  blir en issue i Workers Observability.

## Konsekvenser
- Loggene inneholder ingen personopplysninger.
- Cloudflare viser ikke varighet eller sporing av kallet til LiveTrack24. Feil derfra logges av Workeren.
- Ny logging følger den samme regelen (se [docs/security.md](../security.md#logger)), og
  `tests/unit/worker-log.test.mjs` sjekker at IP, nettleserinfo og spørrestrenger ikke havner i loggen.

## Alternativer som ble vurdert
- **Cloudflares logg per kall og sporing:** gir mer innsikt, men med IP, nettleserinfo og spørrestrenger.
- **Ingen logger:** gir ingen varsler om brudd på CSP eller feil mot LiveTrack24.
