locals {
  block_expression = join(" or ", concat(
    [for s in var.blocked_paths.ends_with : "(ends_with(http.request.uri.path, \"${s}\"))"],
    [for s in var.blocked_paths.starts_with : "(starts_with(http.request.uri.path, \"${s}\"))"],
  ))
}

# Sender f.eks. www.example.com/sti videre til https://example.com/sti
resource "cloudflare_ruleset" "redirect" {
  count = length(var.redirect_to_apex) > 0 ? 1 : 0

  zone_id = var.zone_id
  name    = "default"
  kind    = "zone"
  phase   = "http_request_dynamic_redirect"
  rules = [for host in var.redirect_to_apex : {
    description = "${host} til ${var.domain}"
    expression  = "(http.host eq \"${host}\")"
    action      = "redirect"
    enabled     = true
    action_parameters = {
      from_value = {
        status_code           = 301
        preserve_query_string = true
        target_url = {
          expression = "concat(\"https://${var.domain}\", http.request.uri.path)"
        }
      }
    }
  }]
}

resource "cloudflare_ruleset" "waf" {
  count = local.block_expression == "" ? 0 : 1

  zone_id = var.zone_id
  name    = "default"
  kind    = "zone"
  phase   = "http_request_firewall_custom"
  rules = [{
    description = var.blocked_paths.description
    expression  = local.block_expression
    action      = "block"
    enabled     = true
  }]
}

resource "cloudflare_ruleset" "rate_limit" {
  count = var.rate_limit == null ? 0 : 1

  zone_id = var.zone_id
  name    = "default"
  kind    = "zone"
  phase   = "http_ratelimit"
  rules = [{
    description = var.rate_limit.description
    expression  = "(http.request.uri.path in {${join(" ", [for p in var.rate_limit.paths : "\"${p}\""])}})"
    action      = "block"
    enabled     = true
    ratelimit = {
      characteristics     = ["ip.src", "cf.colo.id"]
      period              = var.rate_limit.period_seconds
      requests_per_period = var.rate_limit.requests
      mitigation_timeout  = var.rate_limit.timeout_seconds
    }
  }]
}

moved {
  from = cloudflare_ruleset.videresending
  to   = cloudflare_ruleset.redirect
}

moved {
  from = cloudflare_ruleset.ratebegrensning
  to   = cloudflare_ruleset.rate_limit
}
