# Alt som er spesielt for én sone kommer inn som variabler, så modulen kan brukes for andre domener med en
# egen tfvars-fil. Ingen hemmeligheter går gjennom variablene her.

variable "konto_id" {
  description = "Cloudflare-kontoen sonen ligger i."
  type        = string
}

variable "sone_id" {
  description = "Sonen som skal styres."
  type        = string
}

variable "domene" {
  description = "Sonens domene, f.eks. hofstad.net."
  type        = string
}

variable "dns_poster" {
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

variable "caa_utstedere" {
  description = "Utstedere som får lage vanlige og wildcard-sertifikater (CAA issue og issuewild)."
  type        = list(string)
  default     = []
}

variable "caa_varsel" {
  description = "Adresse (mailto: eller https:) som får beskjed om avviste sertifikatforespørsler (CAA iodef). Tom for ingen."
  type        = string
  default     = ""
}

variable "innstillinger" {
  description = "Soneinnstillinger med tekstverdi, f.eks. { min_tls_version = \"1.2\" }."
  type        = map(string)
  default     = {}
}

variable "tallinnstillinger" {
  description = "Soneinnstillinger med tallverdi, f.eks. { browser_cache_ttl = 0 }."
  type        = map(number)
  default     = {}
}

variable "dnssec" {
  description = "Slå på DNSSEC. DS-posten (se output dnssec_ds) må i tillegg ligge hos registraren."
  type        = bool
  default     = true
}

variable "videresend_til_hoveddomene" {
  description = "Vertsnavn som sendes videre (301) til https://<domene> med samme sti, f.eks. [\"www.hofstad.net\"]."
  type        = list(string)
  default     = []
}

variable "blokkerte_stier" {
  description = "WAF-regel som blokkerer stier som starter eller slutter med verdiene i listene."
  type = object({
    beskrivelse = optional(string, "Blokker kjente skannerforsøk")
    starter_med = optional(list(string), [])
    slutter_med = optional(list(string), [])
  })
  default = {}
}

variable "ratebegrensning" {
  description = "Rate limiting per IP på én sti. null for ingen."
  type = object({
    sti                 = string
    beskrivelse         = optional(string, "Rate limiting per IP")
    foresporsler        = number
    periode_sekunder    = number
    blokkering_sekunder = number
  })
  default = null
}

variable "ki_roboter" {
  description = "Cloudflares vern mot KI-roboter: \"block\" eller \"disabled\"."
  type        = string
  default     = "block"
}

variable "bot_fight_mode" {
  description = "Bot Fight Mode. Krever innebygd JavaScript fra Cloudflare, som en streng CSP stopper."
  type        = bool
  default     = false
}

variable "varsel_epost" {
  description = "E-postadresse for varsler fra Cloudflare. Tom for ingen varsler."
  type        = string
  default     = ""
}

variable "varsler" {
  description = "Varsler fra Cloudflare (Notifications). Nøkkelen er et fast navn i koden."
  type = map(object({
    navn        = string
    beskrivelse = optional(string)
    type        = string
  }))
  default = {}
}
