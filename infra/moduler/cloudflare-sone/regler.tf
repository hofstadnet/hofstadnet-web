locals {
  blokker_uttrykk = join(" or ", concat(
    [for s in var.blokkerte_stier.slutter_med : "(ends_with(http.request.uri.path, \"${s}\"))"],
    [for s in var.blokkerte_stier.starter_med : "(starts_with(http.request.uri.path, \"${s}\"))"],
  ))
}

# Sender f.eks. www.hofstad.net/sti videre til https://hofstad.net/sti
resource "cloudflare_ruleset" "videresending" {
  count = length(var.videresend_til_hoveddomene) > 0 ? 1 : 0

  zone_id = var.sone_id
  name    = "default"
  kind    = "zone"
  phase   = "http_request_dynamic_redirect"
  rules = [for vert in var.videresend_til_hoveddomene : {
    description = "${vert} til ${var.domene}"
    expression  = "(http.host eq \"${vert}\")"
    action      = "redirect"
    enabled     = true
    action_parameters = {
      from_value = {
        status_code           = 301
        preserve_query_string = true
        target_url = {
          expression = "concat(\"https://${var.domene}\", http.request.uri.path)"
        }
      }
    }
  }]
}

resource "cloudflare_ruleset" "waf" {
  count = local.blokker_uttrykk == "" ? 0 : 1

  zone_id = var.sone_id
  name    = "default"
  kind    = "zone"
  phase   = "http_request_firewall_custom"
  rules = [{
    description = var.blokkerte_stier.beskrivelse
    expression  = local.blokker_uttrykk
    action      = "block"
    enabled     = true
  }]
}

resource "cloudflare_ruleset" "ratebegrensning" {
  count = var.ratebegrensning == null ? 0 : 1

  zone_id = var.sone_id
  name    = "default"
  kind    = "zone"
  phase   = "http_ratelimit"
  rules = [{
    description = var.ratebegrensning.beskrivelse
    expression  = "(http.request.uri.path eq \"${var.ratebegrensning.sti}\")"
    action      = "block"
    enabled     = true
    ratelimit = {
      characteristics     = ["ip.src", "cf.colo.id"]
      period              = var.ratebegrensning.periode_sekunder
      requests_per_period = var.ratebegrensning.foresporsler
      mitigation_timeout  = var.ratebegrensning.blokkering_sekunder
    }
  }]
}
