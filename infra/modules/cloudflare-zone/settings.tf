resource "cloudflare_zone_setting" "text" {
  for_each = var.settings

  zone_id    = var.zone_id
  setting_id = each.key
  value      = each.value
}

resource "cloudflare_zone_setting" "number" {
  for_each = var.number_settings

  zone_id    = var.zone_id
  setting_id = each.key
  value      = each.value
}

resource "cloudflare_bot_management" "zone" {
  zone_id            = var.zone_id
  ai_bots_protection = var.ai_bots
  fight_mode         = var.bot_fight_mode
  enable_js          = var.bot_fight_mode
}

