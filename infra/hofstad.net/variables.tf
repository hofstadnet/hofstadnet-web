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
variable "alert_email" {
  description = "E-postadresse for varsler fra Cloudflare. Settes med TF_VAR_alert_email fra secreten ALERT_EMAIL."
  type        = string
  sensitive   = true

  # Uten secreten ville adressen blitt tom, og varslene slettet. Stopp heller planen.
  validation {
    condition     = can(regex("^[^@ ]+@[^@ ]+$", var.alert_email))
    error_message = "ALERT_EMAIL mangler eller er ikke en e-postadresse. Legg den inn som secret i repoet."
  }
}

variable "alerts" { type = any }
