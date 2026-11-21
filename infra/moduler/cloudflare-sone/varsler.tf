resource "cloudflare_notification_policy" "varsel" {
  for_each = var.varsel_epost == "" ? {} : var.varsler

  account_id  = var.konto_id
  name        = each.value.navn
  description = each.value.beskrivelse
  alert_type  = each.value.type
  enabled     = true
  mechanisms = {
    email = [{ id = var.varsel_epost }]
  }
}

output "dnssec_ds" {
  description = "DS-posten som skal ligge hos registraren."
  value       = var.dnssec ? cloudflare_zone_dnssec.sone[0].ds : null
}
