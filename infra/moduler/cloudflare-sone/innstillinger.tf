resource "cloudflare_zone_setting" "tekst" {
  for_each = var.innstillinger

  zone_id    = var.sone_id
  setting_id = each.key
  value      = each.value
}

resource "cloudflare_zone_setting" "tall" {
  for_each = var.tallinnstillinger

  zone_id    = var.sone_id
  setting_id = each.key
  value      = each.value
}

resource "cloudflare_bot_management" "sone" {
  zone_id            = var.sone_id
  ai_bots_protection = var.ki_roboter
  fight_mode         = var.bot_fight_mode
  enable_js          = var.bot_fight_mode
}
