# Verdiene står i terraform.tfvars. Typene og beskrivelsene ligger i modulen (../modules/cloudflare-zone).

variable "state_passphrase" {
  description = "Passfrase for kryptering av state og planer (minst 16 tegn). Settes med TF_VAR_state_passphrase."
  type        = string
  sensitive   = true
}

variable "account_id" { type = string }
variable "zone_id" { type = string }
variable "domain" { type = string }
variable "dns_records" { type = any }
variable "caa_issuers" { type = list(string) }
variable "caa_iodef" { type = string }
variable "settings" { type = map(string) }
variable "number_settings" { type = map(number) }
variable "dnssec" { type = bool }
variable "redirect_to_apex" { type = list(string) }
variable "blocked_paths" { type = any }
variable "rate_limit" { type = any }
variable "ai_bots" { type = string }
variable "bot_fight_mode" { type = bool }
variable "alert_email" { type = string }
variable "alerts" { type = any }
