# Alt som er spesielt for én sone, kommer inn som variabler, så modulen kan brukes for andre domener med en
# egen tfvars-fil. Ingen hemmeligheter går gjennom variablene her.

variable "account_id" {
  description = "Cloudflare-kontoen sonen ligger i."
  type        = string
}

variable "zone_id" {
  description = "Sonen som skal styres."
  type        = string
}

variable "domain" {
  description = "Sonens domene, f.eks. example.com."
  type        = string
}

variable "dns_records" {
  description = "Vanlige DNS-poster utenom CAA. Nøkkelen er et fast navn i koden, ikke vertsnavnet."
  type = map(object({
    type     = string
    name     = string
    content  = string
    ttl      = optional(number, 1)
    proxied  = optional(bool, false)
    priority = optional(number)
    comment  = optional(string)
  }))
  default = {}
}

variable "caa_issuers" {
  description = "Utstedere som får lage vanlige og wildcard-sertifikater (CAA issue og issuewild)."
  type        = list(string)
  default     = []
}

variable "caa_iodef" {
  description = "Adresse (mailto: eller https:) som får beskjed om avviste sertifikatforespørsler. Tom for ingen."
  type        = string
  default     = ""
}

variable "settings" {
  description = "Soneinnstillinger med tekstverdi, f.eks. { min_tls_version = \"1.2\" }."
  type        = map(string)
  default     = {}
}

variable "number_settings" {
  description = "Soneinnstillinger med tallverdi, f.eks. { browser_cache_ttl = 0 }."
  type        = map(number)
  default     = {}
}

variable "dnssec" {
  description = "Slå på DNSSEC. DS-posten (output dnssec_ds) må i tillegg ligge hos registraren."
  type        = bool
  default     = true
}

variable "redirect_to_apex" {
  description = "Vertsnavn som sendes videre (301) til https://<domain> med samme sti, f.eks. [\"www.example.com\"]."
  type        = list(string)
  default     = []
}

variable "blocked_paths" {
  description = "WAF-regel som blokkerer stier som starter eller slutter med verdiene i listene."
  type = object({
    description = optional(string, "Blokker kjente skannerforsøk")
    starts_with = optional(list(string), [])
    ends_with   = optional(list(string), [])
  })
  default = {}
}

variable "rate_limit" {
  description = "Rate limiting per IP på stiene i listen (felles grense). null for ingen."
  type = object({
    paths           = list(string)
    description     = optional(string, "Rate limiting per IP")
    requests        = number
    period_seconds  = number
    timeout_seconds = number
  })
  default = null
}

variable "ai_bots" {
  description = "Cloudflares vern mot KI-roboter: \"block\" eller \"disabled\"."
  type        = string
  default     = "block"
}

variable "bot_fight_mode" {
  description = "Bot Fight Mode. Krever innebygd JavaScript fra Cloudflare, som en streng CSP stopper."
  type        = bool
  default     = false
}

variable "alert_email" {
  description = "E-postadresse for varsler fra Cloudflare. Tom for ingen varsler."
  type        = string
  default     = ""
  sensitive   = true
}

variable "alerts" {
  description = "Varsler fra Cloudflare (Notifications). Nøkkelen er et fast navn i koden."
  type = map(object({
    name        = string
    description = optional(string)
    type        = string
  }))
  default = {}
}
