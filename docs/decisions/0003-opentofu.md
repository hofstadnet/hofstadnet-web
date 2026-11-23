# 0003: OpenTofu for Cloudflare-sonen, ikke Terraform

- **Status:** Vedtatt

## Bakgrunn
Cloudflare-sonen (DNS, TLS, WAF, rate limiting, videresending og varsler) skal være kode som endres via pull request,
med plan før endring og en avvikssjekk som finner endringer gjort i dashbordet.

## Beslutning
Sonen beskrives med OpenTofu i `infra/`. State ligger i R2, kryptert med den innebygde krypteringen i OpenTofu.
`infra.yml` kjører plan på pull requests og apply etter merge, med godkjenning i miljøet `cloudflare`.

## Konsekvenser
- Åpen lisens (MPL-2.0). Språket og Cloudflare-provideren er de samme som for Terraform.
- State er kryptert før den lastes opp, så R2-nøkkelen alene gir ikke innholdet.
- Passfrasen for state må tas vare på utenfor repoet. Uten den må ressursene importeres på nytt.
- Detaljer i [infra/README.md](../../infra/README.md).

## Alternativer som ble vurdert
- **Terraform:** ikke åpen lisens, og ingen innebygd kryptering av state.
- **Endringer i dashbordet:** ingen gjennomgang, historikk eller avvikssjekk.
