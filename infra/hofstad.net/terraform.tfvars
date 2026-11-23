# Oppsettet for hofstad.net. Ingen hemmeligheter her: alt dette er synlig i DNS eller ufarlig å vise.
# ID-ene er ikke hemmelige. De gir ingen tilgang uten et API-token.

account_id = "b055719a9337c9d844c7b41ee78fcad9"
zone_id    = "c42c9487b8e736815b3af9adae8fccb6"
domain     = "hofstad.net"

# Postene for selve siden (hofstad.net og www) lages av Workeren (custom domain i wrangler.jsonc) og er ikke med her.
dns_records = {
  # E-post: domenet tar bare imot, via Cloudflare Email Routing
  mx_1 = { type = "MX", name = "hofstad.net", content = "route1.mx.cloudflare.net", priority = 34 }
  mx_2 = { type = "MX", name = "hofstad.net", content = "route2.mx.cloudflare.net", priority = 91 }
  mx_3 = { type = "MX", name = "hofstad.net", content = "route3.mx.cloudflare.net", priority = 81 }
  # «Null MX» (RFC 7505): www tar ikke imot e-post
  mx_www = { type = "MX", name = "www.hofstad.net", content = ".", priority = 0 }
  spf    = { type = "TXT", name = "hofstad.net", content = "\"v=spf1 include:_spf.mx.cloudflare.net ~all\"" }
  dmarc  = { type = "TXT", name = "_dmarc.hofstad.net", content = "\"v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s\"", comment = "Domenet sender ikke e-post selv" }
  dkim = {
    type    = "TXT"
    name    = "cf2024-1._domainkey.hofstad.net"
    content = "\"v=DKIM1; h=sha256; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAiweykoi+o48IOGuP7GR3X0MOExCUDY/BCRHoWBnh3rChl7WhdyCxW3jgq1daEjPPqoi7sJvdg5hEQVsgVRQP4DcnQDVjGMbASQtrY4WmB1VebF+RPJB2ECPsEDTpeiI5ZyUAwJaVX7r6bznU67g7LvFq35yIo4sdlmtZGV+i0H4cpYH9+3JJ78k\" \"m4KXwaf9xUJCWF6nxeD+qG6Fyruw1Qlbds2r85U9dkNDVAS3gioCvELryh1TxKGiVTkg4wqHTyHfWsp7KD3WQHYJn0RyfJJu6YEmL77zonn7p2SRMvTMP3ZEXibnC9gz3nnhR6wcYL8Q7zXypKTMD58bTixDSJwIDAQAB\""
  }

  # Statussiden på GitHub Pages (repoet hofstadnet/status)
  status = { type = "CNAME", name = "status.hofstad.net", content = "hofstadnet.github.io", comment = "Upptime-statusside (GitHub Pages, repo hofstadnet/status)" }
  # Bekrefter at domenet tilhører GitHub-organisasjonen hofstadnet, og at bare den kan bruke det på GitHub Pages
  github_org   = { type = "TXT", name = "_gh-hofstadnet-o.hofstad.net", content = "\"b69f21ea56\"" }
  github_pages = { type = "TXT", name = "_github-pages-challenge-hofstadnet.hofstad.net", content = "\"73a60f8f2c9c365d26f1e369ef24cc\"", ttl = 300, comment = "GitHub Pages domeneverifisering for hofstadnet-organisasjonen" }
  # Bekrefter eierskapet i Google Search Console. Må bli liggende, ellers mister eieren tilgangen der.
  google_site_verification = { type = "TXT", name = "hofstad.net", content = "\"google-site-verification=qoiqwUbeR8SHSSGsJt3NrSprr8z0ZJ8RjY9arfFuvRA\"", ttl = 3600, comment = "Google Search Console" }
}

caa_issuers = ["letsencrypt.org", "pki.goog", "ssl.com"]
# Ingen iodef-adresse: få utstedere sender slike rapporter, og CT-varslingen dekker behovet.
caa_iodef = ""

settings = {
  ssl                      = "full"
  min_tls_version          = "1.2"
  tls_1_3                  = "on"
  always_use_https         = "on"
  automatic_https_rewrites = "on"
  http3                    = "on"
  "0rtt"                   = "off"
  always_online            = "off"
}
# 0 = «Respect Existing Headers»: Cache-Control fra siden og Workeren gjelder
number_settings = {
  browser_cache_ttl = 0
}

dnssec = true

redirect_to_apex = ["www.hofstad.net"]

blocked_paths = {
  description = "Blokker WordPress- og skannerforsøk"
  ends_with   = [".php"]
  starts_with = ["/wp-admin", "/wp-includes", "/wp-json", "/.env", "/.git"]
}

rate_limit = {
  paths           = ["/api/status", "/api/csp"]
  description     = "Begrens /api/status og /api/csp per IP"
  requests        = 20
  period_seconds  = 10
  timeout_seconds = 10
}

ai_bots        = "block"
bot_fight_mode = false

# Adressen for varsler (alert_email) står ikke her, men kommer fra secreten ALERT_EMAIL (TF_VAR_alert_email).
# Varselet «hofstadnet-web: ny feil i Workeren» (workers_observability_real_time_issue) finnes også, men står
# utenfor koden: Cloudflare-provideren 5.29.0 godtar ikke den varseltypen ennå. Legg det inn her når den gjør det.
alerts = {
  ddos = { name = "hofstad.net: HTTP DDoS-angrep", description = "Varsel når Cloudflare stopper et DDoS-angrep mot sonen.", type = "dos_attack_l7" }
}
