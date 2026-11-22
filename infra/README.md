# Infrastruktur (OpenTofu)

Cloudflare-oppsettet for hofstad.net som kode: DNS, CAA, DNSSEC, soneinnstillinger, WAF-regel, rate limiting,
videresending fra www, vern mot KI-roboter og varsler. Workeren, sikkerhetshodene og videresendingene på selve
siden ligger i `wrangler.jsonc` og `public/`.

```
infra/
  modules/cloudflare-zone/   gjenbrukbar modul, alt kommer inn som variabler
  hofstad.net/               oppsettet for denne sonen
    terraform.tfvars         verdiene (ingen hemmeligheter)
    versions.tf              provider, backend (R2) og kryptering
    main.tf                  kaller modulen
    variables.tf             variablene modulen trenger
    .terraform.lock.hcl      sjekksummer for provideren
```

## Valg

- **OpenTofu, ikke Terraform.** Åpen lisens (MPL-2.0, Linux Foundation) og innebygd kryptering av state. Språket og
  Cloudflare-provideren er de samme som for Terraform.
- **Modul og tfvars.** Alt som er spesielt for hofstad.net, står i `terraform.tfvars`. Et annet domene får en egen mappe
  ved siden av `hofstad.net/` og bruker samme modul.
- **State i R2, kryptert.** State er OpenTofus oversikt over hvilke ressurser koden eier. Den ligger i R2-bøtta
  `hofstadnet-tofu` (`hofstad.net/terraform.tfstate`), låses under kjøring (`use_lockfile`) og krypteres med
  AES-GCM før opplasting. Den legges aldri i git.
- **Låste versjoner.** OpenTofu-versjonen er låst i `.github/workflows/infra.yml`, provideren i `versions.tf` og
  sjekksummene i `.terraform.lock.hcl`. Dependabot foreslår nye versjoner av provideren.
- **Ingen hemmeligheter i repoet.** API-tokenet, R2-nøklene og passfrasen ligger som GitHub-secrets.

## Flyt

`.github/workflows/infra.yml`:

1. **check** på alle endringer i `infra/`: `tofu fmt -check` og `tofu validate`. Trenger ingen nøkler.
2. **plan** på pull requests og før hver apply. Resultatet står i oppsummeringen av kjøringen.
3. **apply** etter merge til `main`, bare når planen har endringer. Krever godkjenning i miljøet `cloudflare`.
4. **drift** hver mandag: planen kjøres mot Cloudflare. Viser den endringer, er noe endret utenfor koden, og det
   opprettes en issue. Ingenting endres automatisk.

`plan` og `apply` kjører bare når repovariabelen `TOFU_ENABLED` er `true`. Plan og apply sender maks 4 forespørsler
samtidig, så Cloudflare-API-et ikke svarer med rate limiting.

Endringer gjort i dashbordet blir rapportert av avvikssjekken og overskrevet ved neste apply.

## Utenfor koden

- **Worker-varselet** «hofstadnet-web: ny feil i Workeren» (`workers_observability_real_time_issue`): Cloudflare-
  provideren godtar ikke varseltypen ennå. Legg det inn i `alerts` i `terraform.tfvars` og importer det når den gjør det.
- **Email Routing:** målet for videresendingen er en privat e-postadresse som ikke skal stå i et offentlig repo.
- **Postene for selve siden** (hofstad.net og www) lages av Workeren som custom domain.
- **API-tokenene og R2-bøtta** for OpenTofu, fordi koden ikke skal kunne lage sine egne nøkler.

## Oppsett for en ny sone eller konto

Nøklene lages manuelt i Cloudflare-dashbordet, fordi et token som kan lage tokens, gir nesten full tilgang til kontoen.

1. **R2:** slå på R2 Object Storage og lag en privat bøtte for state, uten offentlig adresse.
2. **R2-token:** R2 → Manage API tokens → Create Account API token, med *Object Read & Write* på bare den bøtta.
3. **Cloudflare-token:** Manage Account → Account API Tokens → Create Token, med to policyer:
   - *Specified Domains* → sonen: DNS, Zone Settings, Zone WAF, Bot Management og Dynamic URL Redirects (Edit), og
     Zone (Read)
   - *Entire Account*: Notifications (Edit)

   Sett utløpsdato. `token-expiry.yml` varsler 30 dager før.
4. **Passfrase** for kryptering av state, minst 16 tegn, lagret i en passordbehandler. Uten den kan state ikke leses,
   og ressursene må importeres på nytt.
5. **GitHub-secrets og variabel:**

   ```bash
   gh secret set CLOUDFLARE_API_TOKEN
   gh secret set R2_ACCESS_KEY_ID
   gh secret set R2_SECRET_ACCESS_KEY
   gh secret set TOFU_STATE_PASSPHRASE
   gh variable set TOFU_ENABLED --body true
   ```

6. **Import:** finnes ressursene allerede, legg til en midlertidig `importer.tf` med `import`-blokker. Første plan
   skal vise bare import, uten endringer eller slettinger. Slett filen etter første apply.

## Lokalt

```bash
cd infra/hofstad.net
export CLOUDFLARE_API_TOKEN=… AWS_ACCESS_KEY_ID=… AWS_SECRET_ACCESS_KEY=… TF_VAR_state_passphrase=…
tofu init
tofu plan
```
