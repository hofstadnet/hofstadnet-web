resource "cloudflare_notification_policy" "alert" {
  # nonsensitive: bare om adressen er tom brukes til for_each, ikke selve adressen
  for_each = nonsensitive(var.alert_email == "") ? {} : var.alerts

  account_id  = var.account_id
  name        = each.value.name
  description = each.value.description
  alert_type  = each.value.type
  enabled     = true
  mechanisms = {
    email = [{ id = var.alert_email }]
  }
}

output "dnssec_ds" {
  description = "DS-posten som skal ligge hos registraren."
  value       = var.dnssec ? cloudflare_zone_dnssec.zone[0].ds : null
}
