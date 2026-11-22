# Infrastruktur (OpenTofu)

Cloudflare-oppsettet for hofstad.net som kode: DNS, CAA, DNSSEC, soneinnstillinger, WAF-regel, rate limiting,
videresending fra www, vern mot KI-roboter og varsler. Workeren, sikkerhetshodene og videresendingene på selve
siden ligger ikke her, men i `wrangler.jsonc` og `public/`.

```
infra/
  moduler/cloudflare-sone/   gjenbrukbar modul, alt kommer inn som variabler
  hofstad.net/               oppsettet for denne sonen
    terraform.tfvars         verdiene (ingen hemmeligheter)
    versions.tf              provider, backend (R2) og kryptering
    main.tf                  kaller modulen
    importer.tf              kobler eksisterende ressurser til koden første gang
```

## Valg

- **OpenTofu, ikke Terraform.** Åpen lisens (MPL-2.0, Linux Foundation). Terraform har hatt BSL siden 2023.
  OpenTofu har også innebygd kryptering av state. Språket og Cloudflare-provideren er de samme, så koden kan flyttes.
- **Modul + tfvars.** Alt som er spesielt for hofstad.net står i `terraform.tfvars`. Et annet domene får en ny mappe
  ved siden av `hofstad.net/` med sin egen tfvars-fil, og bruker samme modul.
- **State i R2, kryptert.** OpenTofu må huske hvilke ressurser koden eier, og det er state. Den ligger i
  R2-bøtta `hofstadnet-tofu` i Cloudflare-kontoen, låses under kjøring (`use_lockfile`) og krypteres med AES-GCM
  før den lastes opp. Den legges aldri i git, fordi state kan inneholde verdier fra Cloudflare som ikke står i koden.
- **Låste versjoner.** OpenTofu-versjonen er låst i workflowen, provideren i `versions.tf`, og sjekksummene i
  `.terraform.lock.hcl`. Dependabot foreslår oppdateringer av Actions.
- **Ingen hemmeligheter i repoet.** API-tokenet, R2-nøklene og passfrasen ligger bare som GitHub-secrets.

## Flyt

`.github/workflows/infra.yml`:

1. **sjekk** på alle endringer i `infra/`: `tofu fmt -check` og `tofu validate`. Trenger ingen nøkler.
2. **plan** på pull requests: viser hva som vil endres, i oppsummeringen av kjøringen.
3. **apply** etter merge til main, bare når planen har endringer. Venter på godkjenning i miljøet `cloudflare`.

`plan` og `apply` kjører først når repovariabelen `TOFU_ENABLED` er `true`.

Utenfor koden: Worker-varselet «hofstadnet-web: ny feil i Workeren», fordi Cloudflare-provideren 5.29.0 ikke
godtar varseltypen `workers_observability_real_time_issue` ennå. Email Routing (videresendingen av e-post) er
også utenfor, fordi målet er en privat e-postadresse som ikke skal stå i et offentlig repo.

Endringer gjort i dashbordet blir overskrevet ved neste apply. Gjør endringer her, eller legg dem inn her etterpå.

## Oppsett (én gang)

Disse stegene gjør du selv, fordi de lager nøkler:

1. **Slå på R2:** Cloudflare-dashbordet → R2 Object Storage → slå på (gratisnivået holder godt).
   Lag bøtta `hofstadnet-tofu` (eller si fra, så lager jeg den via API-et).
2. **R2-nøkkel:** R2 → Manage API tokens → Create API token. Tillatelse *Object Read & Write*, bare bøtta
   `hofstadnet-tofu`. Ta vare på Access Key ID og Secret Access Key.
3. **Cloudflare-API-token:** My Profile → API Tokens → Create Custom Token, med bare sonen hofstad.net:
   - Zone → DNS: Edit
   - Zone → Zone Settings: Edit
   - Zone → Zone WAF: Edit
   - Zone → Single Redirect: Edit
   - Zone → Bot Management: Edit
   - Zone → Zone: Read
   - Account → Notifications: Edit (kontoen)

   Sett gjerne utløpsdato (f.eks. ett år) og legg en påminnelse i kalenderen.
4. **Passfrase for krypteringen** (minst 16 tegn), f.eks. `openssl rand -base64 32`. Ta vare på den i
   passordbehandleren. Uten den kan state ikke leses (da må alt importeres på nytt).
5. **GitHub-secrets og variabel** i repoet:

   ```bash
   gh secret set CLOUDFLARE_API_TOKEN
   gh secret set R2_ACCESS_KEY_ID
   gh secret set R2_SECRET_ACCESS_KEY
   gh secret set TOFU_STATE_PASSPHRASE
   gh variable set TOFU_ENABLED --body true
   ```

   `gh secret set` spør etter verdien, så den havner ikke i skallhistorikken.
6. **Første kjøring:** Actions → Infrastruktur → Run workflow. Planen skal vise at ressursene importeres, og
   ingen endringer eller slettinger. Godkjenn apply. Etterpå kan `importer.tf` slettes i en egen PR.
   (For hofstad.net er dette gjort: 32 ressurser ble importert 22.11.2026.)

## Lokalt

```bash
cd infra/hofstad.net
export CLOUDFLARE_API_TOKEN=… AWS_ACCESS_KEY_ID=… AWS_SECRET_ACCESS_KEY=… TF_VAR_tilstandsnokkel=…
tofu init
tofu plan
```
