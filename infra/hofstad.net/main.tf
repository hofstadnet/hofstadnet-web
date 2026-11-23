# Cloudflare-oppsettet for hofstad.net. Verdiene står i terraform.tfvars, selve ressursene i modulen.
# Workeren, sikkerhetshodene og videresendingene på siden ligger ikke her, men i wrangler.jsonc og public/.
module "zone" {
  source = "../modules/cloudflare-zone"

  account_id       = var.account_id
  zone_id          = var.zone_id
  domain           = var.domain
  dns_records      = var.dns_records
  caa_issuers      = var.caa_issuers
  caa_iodef        = var.caa_iodef
  settings         = var.settings
  number_settings  = var.number_settings
  dnssec           = var.dnssec
  redirect_to_apex = var.redirect_to_apex
  blocked_paths    = var.blocked_paths
  rate_limit       = var.rate_limit
  ai_bots          = var.ai_bots
  bot_fight_mode   = var.bot_fight_mode
  alert_email      = var.alert_email
  alerts           = var.alerts
}

output "dnssec_ds" {
  description = "DS-posten som skal ligge hos registraren."
  value       = module.zone.dnssec_ds
}
