resource "cloudflare_dns_record" "post" {
  for_each = var.dns_poster

  zone_id  = var.sone_id
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
    { for par in setproduct(["issue", "issuewild"], var.caa_utstedere) : "${par[0]}-${par[1]}" => { tag = par[0], value = par[1], comment = "Universal SSL (Cloudflare)" } },
    var.caa_varsel == "" ? {} : { iodef = { tag = "iodef", value = var.caa_varsel, comment = "Varsel ved avvist sertifikat" } },
  )
}

# Bare utstederne i listen kan lage sertifikater for domenet
resource "cloudflare_dns_record" "caa" {
  for_each = local.caa

  zone_id = var.sone_id
  type    = "CAA"
  name    = var.domene
  ttl     = 1
  comment = each.value.comment
  data = {
    flags = 0
    tag   = each.value.tag
    value = each.value.value
  }
}

resource "cloudflare_zone_dnssec" "sone" {
  count = var.dnssec ? 1 : 0

  zone_id = var.sone_id
  status  = "active"
}
