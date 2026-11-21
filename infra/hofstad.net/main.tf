# Cloudflare-oppsettet for hofstad.net. Verdiene står i terraform.tfvars, selve ressursene i modulen.
# Workeren, sikkerhetshodene og videresendingene på siden ligger ikke her, men i wrangler.jsonc og public/.
module "sone" {
  source = "../moduler/cloudflare-sone"

  konto_id                   = var.konto_id
  sone_id                    = var.sone_id
  domene                     = var.domene
  dns_poster                 = var.dns_poster
  caa_utstedere              = var.caa_utstedere
  caa_varsel                 = var.caa_varsel
  innstillinger              = var.innstillinger
  tallinnstillinger          = var.tallinnstillinger
  dnssec                     = var.dnssec
  videresend_til_hoveddomene = var.videresend_til_hoveddomene
  blokkerte_stier            = var.blokkerte_stier
  ratebegrensning            = var.ratebegrensning
  ki_roboter                 = var.ki_roboter
  bot_fight_mode             = var.bot_fight_mode
  varsel_epost               = var.varsel_epost
  varsler                    = var.varsler
}

output "dnssec_ds" {
  description = "DS-posten som skal ligge hos registraren (Dynadot)."
  value       = module.sone.dnssec_ds
}
