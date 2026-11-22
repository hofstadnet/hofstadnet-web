resource "cloudflare_notification_policy" "alert" {
  for_each = var.alert_email == "" ? {} : var.alerts

  account_id  = var.account_id
  name        = each.value.name
  description = each.value.description
  alert_type  = each.value.type
  enabled     = true
  mechanisms = {
    email = [{ id = var.alert_email }]
  }
}

moved {
  from = cloudflare_notification_policy.varsel
  to   = cloudflare_notification_policy.alert
}

output "dnssec_ds" {
  description = "DS-posten som skal ligge hos registraren."
  value       = var.dnssec ? cloudflare_zone_dnssec.zone[0].ds : null
}
