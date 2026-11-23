# 0001: Cloudflare Workers med statiske filer, ikke Cloudflare Pages eller GitHub Pages

- **Status:** Vedtatt

## Bakgrunn
Siden er statiske filer, men flystatusen og mottaket av CSP-rapporter trenger en liten serverdel. Siden skal ha egne
sikkerhetshoder, og ingen del av den skal kunne nås forbi Cloudflares WAF og DDoS-vern.

## Beslutning
Workeren `hofstadnet-web` leverer de statiske filene fra `dist/` og kjører kode bare for `/api/*`
(`run_worker_first` i `wrangler.jsonc`). Cloudflare Workers Builds bygger og publiserer fra `main`, og pull
requests får egne forhåndsvisninger.

## Konsekvenser
- Det finnes ingen origin å beskytte. Statiske filer og API ligger på samme plattform og samme domene.
- Sikkerhetshodene står i `public/_headers`, og Workeren setter sine egne på svarene den lager.
- Byggetokenet styres av Workers Builds og er et brukertoken (se
  [docs/security.md](../security.md#tilganger-og-nøkler)).

## Alternativer som ble vurdert
- **GitHub Pages bak Cloudflare:** `*.github.io` ville svart direkte på internett, forbi WAF og DDoS-vern, og det
  finnes ingen serverdel for flystatusen.
- **Cloudflare Pages:** Cloudflare anbefaler Workers med statiske filer fremfor Pages for nye prosjekter.
