# Alt her fantes før OpenTofu tok over (satt via API-et). Importblokkene kobler de eksisterende ressursene
# til koden ved første «tofu apply», uten at noe lages på nytt. Etter første vellykkede apply kan filen slettes.

locals {
  sone  = "c42c9487b8e736815b3af9adae8fccb6"
  konto = "b055719a9337c9d844c7b41ee78fcad9"

  dns_id = {
    mx_1         = "5c788f8a80314904a059e4a498452248"
    mx_2         = "aeabd0ae5453b56db333d3c083957ae1"
    mx_3         = "6c6d372a4418863317cba6b7c5b65ec1"
    mx_www       = "2596395a4f3e2dd0c7684a668a005ed4"
    spf          = "f2e9cd19712b7f8ed22156afd2943452"
    dmarc        = "f1ffea06891cd13ffe64c1fd4907c9a8"
    dkim         = "e60d0264598202f32913c40e678db769"
    status       = "c3d08cb51135eeba4f64453e486337db"
    github_org   = "233bfbdd6624967622fca2a105a8737b"
    github_pages = "6e022a11696be668285326868e54f9e4"
  }
  caa_id = {
    "issue-letsencrypt.org"     = "46685ae6c0967ea9c39f81728a193f0d"
    "issuewild-letsencrypt.org" = "19848a0de1fb01f6232f6aaa4d1e00c9"
    "issue-pki.goog"            = "9bda4afea47b37c9e5ebb9d38e7180ed"
    "issuewild-pki.goog"        = "3b1f5949e26b28f0c9a8a0557e7f5948"
    "issue-ssl.com"             = "2fa41cb43263f3e9bffdc22b8f28ac2f"
    "issuewild-ssl.com"         = "fb34e5a391f1d435bbe7800e96e1b32d"
    iodef                       = "ac6d7a13e49dc680398dc75960688fe2"
  }
  varsel_id = {
    worker_feil = "3c0f01e1a1ff49379638b203ed04d615"
    ddos        = "e61e50b84f1b404984b9bde4fa9d9d23"
  }
}

import {
  for_each = local.dns_id
  to       = module.sone.cloudflare_dns_record.post[each.key]
  id       = "${local.sone}/${each.value}"
}

import {
  for_each = local.caa_id
  to       = module.sone.cloudflare_dns_record.caa[each.key]
  id       = "${local.sone}/${each.value}"
}

import {
  for_each = var.innstillinger
  to       = module.sone.cloudflare_zone_setting.tekst[each.key]
  id       = "${local.sone}/${each.key}"
}

import {
  for_each = var.tallinnstillinger
  to       = module.sone.cloudflare_zone_setting.tall[each.key]
  id       = "${local.sone}/${each.key}"
}

import {
  to = module.sone.cloudflare_zone_dnssec.sone[0]
  id = local.sone
}

import {
  to = module.sone.cloudflare_bot_management.sone
  id = local.sone
}

import {
  to = module.sone.cloudflare_ruleset.videresending[0]
  id = "zones/${local.sone}/772021a3bd4c417ca06e4111ee8ac7ec"
}

import {
  to = module.sone.cloudflare_ruleset.waf[0]
  id = "zones/${local.sone}/497481e19ca14f5bb273fb382dc37d5c"
}

import {
  to = module.sone.cloudflare_ruleset.ratebegrensning[0]
  id = "zones/${local.sone}/43dda71415e5450398a0ae8fd35487f1"
}

import {
  for_each = local.varsel_id
  to       = module.sone.cloudflare_notification_policy.varsel[each.key]
  id       = "${local.konto}/${each.value}"
}
