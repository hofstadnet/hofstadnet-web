# Sikkerhetssjekkliste

Gå gjennom punktene som gjelder endringen, før pull requesten lages. Bakgrunnen står i
[docs/security.md](../security.md).

## Nettleseren

- [ ] Ingen innebygd kode: ingen `<script>` eller `<style>` uten fil, ingen `style=` eller hendelsesattributter.
      Kontrollen av CSP i bygget stopper dette.
- [ ] Ingen `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` eller skriptadresser fra tekst. Bygg
      elementer med DOM-metoder. Trusted Types stopper resten i nettleseren.
- [ ] Ny tredjepart (skript, bilde, ramme, tilkobling) er bare lagt til når den er nødvendig, med smalest mulig
      kilde i `public/_headers`, og den er beskrevet i `docs/security.md` og på personvernsiden.
- [ ] Nye lenker til andre nettsteder i ny fane har `rel="noopener"`.

## Workeren

- [ ] Ny adresse under `/api/` tar bare imot metodene den trenger, og avviser resten med 405.
- [ ] Ingen parametere fra forespørselen brukes til å bestemme hvor Workeren henter data fra.
- [ ] Størrelsen på innkommende data er begrenset.
- [ ] Adressen er lagt til i rate limiting i `infra/hofstad.net/terraform.tfvars`.
- [ ] Logger inneholder ikke IP, nettleserinfo, spørrestrenger eller innhold fra brukeren.

## Arbeidsflyter

- [ ] Nye actions er låst til commit-SHA, med versjonen i en kommentar.
- [ ] `permissions` er `contents: read` på toppnivå. Jobber som trenger mer, ber om det selv.
- [ ] `actions/checkout` har `persist-credentials: false`.
- [ ] Verdier fra hendelser (titler, branch-navn, kommentarer) brukes via `env`, aldri direkte i `run`.
- [ ] Nye jobbnavn som skal være påkrevde, er lagt inn i regelsettet for `main`.
- [ ] Hemmeligheter ligger som secrets, og bare jobbene som trenger dem, får dem.

## Avhengigheter

- [ ] Nye pakker er nødvendige, vedlikeholdte og har kjent opphav. `npm audit signatures` er grønn.
- [ ] Versjonen er låst i `package.json` og `package-lock.json`.

## Cloudflare

- [ ] Endringer gjøres i `infra/`, ikke i dashbordet.
- [ ] Planen viser bare det som er ment å endres.
- [ ] Tokens får bare tilgangene de trenger, med utløpsdato.

## Personvern

- [ ] Endringer i hva siden samler inn eller sender til andre, er beskrevet på personvernsiden, på både norsk og
      engelsk («privacy» i `src/i18n/nb.ts` og `src/i18n/en.ts`).
- [ ] Språket velges bare med adressen. Valget lagres ikke, og det finnes ingen videresending ut fra nettleserens
      språk.
