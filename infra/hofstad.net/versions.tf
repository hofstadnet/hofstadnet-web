terraform {
  required_version = ">= 1.10"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "5.29.0"
    }
  }

  # State ligger i en R2-bøtte i Cloudflare-kontoen (S3-kompatibel). Nøklene kommer fra miljøvariablene
  # AWS_ACCESS_KEY_ID og AWS_SECRET_ACCESS_KEY (et R2-API-token som bare har tilgang til denne bøtta).
  # use_lockfile hindrer at to kjøringer endrer samtidig.
  backend "s3" {
    bucket                      = "hofstadnet-tofu"
    key                         = "hofstad.net/terraform.tfstate"
    region                      = "auto"
    endpoints                   = { s3 = "https://b055719a9337c9d844c7b41ee78fcad9.r2.cloudflarestorage.com" }
    use_path_style              = true
    use_lockfile                = true
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    skip_s3_checksum            = true
  }

  # State og planer krypteres før de forlater maskinen (AES-GCM, nøkkel avledet med PBKDF2 fra en passfrase).
  # Passfrasen kommer fra TF_VAR_state_passphrase. Uten den kan state verken leses eller skrives.
  # Navnene «passfrase» og «standard» er lagret i den krypterte state-filen. De kan ikke endres uten en
  # nøkkelmigrering med fallback-blokk, og beholdes derfor selv om resten av koden har engelske navn.
  encryption {
    key_provider "pbkdf2" "passfrase" {
      passphrase = var.state_passphrase
    }
    method "aes_gcm" "standard" {
      keys = key_provider.pbkdf2.passfrase
    }
    state {
      method   = method.aes_gcm.standard
      enforced = true
    }
    plan {
      method   = method.aes_gcm.standard
      enforced = true
    }
  }
}

# API-tokenet kommer fra miljøvariabelen CLOUDFLARE_API_TOKEN
provider "cloudflare" {}
