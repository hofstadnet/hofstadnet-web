# Verdiene står i terraform.tfvars. Typene og beskrivelsene ligger i modulen (../moduler/cloudflare-sone).

variable "tilstandsnokkel" {
  description = "Passfrase for kryptering av state og planer (minst 16 tegn). Settes med TF_VAR_tilstandsnokkel."
  type        = string
  sensitive   = true
}

variable "konto_id" { type = string }
variable "sone_id" { type = string }
variable "domene" { type = string }
variable "dns_poster" { type = any }
variable "caa_utstedere" { type = list(string) }
variable "caa_varsel" { type = string }
variable "innstillinger" { type = map(string) }
variable "tallinnstillinger" { type = map(number) }
variable "dnssec" { type = bool }
variable "videresend_til_hoveddomene" { type = list(string) }
variable "blokkerte_stier" { type = any }
variable "ratebegrensning" { type = any }
variable "ki_roboter" { type = string }
variable "bot_fight_mode" { type = bool }
variable "varsel_epost" { type = string }
variable "varsler" { type = any }
