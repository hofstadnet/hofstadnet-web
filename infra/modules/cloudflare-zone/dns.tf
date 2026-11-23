resource "cloudflare_dns_record" "record" {
  for_each = var.dns_records

  zone_id  = var.zone_id
  type     = each.value.type
  name     = each.value.name
  content  = each.value.content
  ttl      = each.value.ttl
  proxied  = each.value.proxied
  priority = each.value.priority
  comment  = each.value.comment
}

locals {
  caa = merge(
    { for pair in setproduct(["issue", "issuewild"], var.caa_issuers) : "${pair[0]}-${pair[1]}" => { tag = pair[0], value = pair[1], comment = "Universal SSL (Cloudflare)" } },
    var.caa_iodef == "" ? {} : { iodef = { tag = "iodef", value = var.caa_iodef, comment = "Varsel ved avvist sertifikat" } },
  )
}

# Bare utstederne i listen kan lage sertifikater for domenet
resource "cloudflare_dns_record" "caa" {
  for_each = local.caa

  zone_id = var.zone_id
  type    = "CAA"
  name    = var.domain
  ttl     = 1
  comment = each.value.comment
  data = {
    flags = 0
    tag   = each.value.tag
    value = each.value.value
  }
}

resource "cloudflare_zone_dnssec" "zone" {
  count = var.dnssec ? 1 : 0

  zone_id = var.zone_id
  status  = "active"
}

