# Beslutningsnotater (ADR)

De viktige valgene for hofstad.net, med begrunnelsen, så den som kommer etter vet *hvorfor* ting er som de er.
Oversikten over arkitekturen står i [docs/architecture.md](../architecture.md).

Ny beslutning: kopier `template.md` til neste nummer og legg den i pull requesten som gjør endringen. En beslutning
redigeres ikke i ettertid. Den erstattes av en ny, og den gamle får statusen «Erstattet av NNNN». Når en beslutning
ble tatt, står i git-historikken.

| Nr. | Beslutning | Status |
|---|---|---|
| [0001](0001-cloudflare-workers.md) | Cloudflare Workers med statiske filer, ikke Cloudflare Pages eller GitHub Pages | Vedtatt |
| [0002](0002-public-repository.md) | Offentlig repo | Vedtatt |
| [0003](0003-opentofu.md) | OpenTofu for Cloudflare-sonen, ikke Terraform | Vedtatt |
| [0004](0004-english-under-en.md) | Engelsk under `/en/`, med egen samling og uten videresending etter `Accept-Language` | Vedtatt |
| [0005](0005-no-forms-or-cookies.md) | Ingen skjemaer og ingen informasjonskapsler | Vedtatt |
| [0006](0006-logs-without-ip.md) | Logger uten IP og nettleserinfo | Vedtatt |
