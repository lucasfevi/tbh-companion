# Findings

Research outputs, written as we learn them and committed with the phase that
produced them. Keep each file focused and factual.

- `steam-market.md` - Phase 0 probe of the Steam Market for appid `3678970`:
  endpoints, page-size cap, currency handling, catalog shape, and provider
  implications. Confirmed viable (648 marketable items).
- `item-mapping.md` - the confirmed `ItemKey -> name/rarity/type/level` source,
  the save data model, catalog refresh strategy, **stage boxes (`910`/`920`/`930`
  STAGEBOX)**, and remaining gaps (partial aggregate SubKey map, gear variant
  probing on Steam).

Related data artifacts (repo root `data/`):

- `data/gamedata.json` - bundled GEAR + MATERIAL catalog (5,875 items: id, name,
  grade, type, level, marketTradable). Offline fallback; user cache overrides
  after refresh.
- `data/stage_boxes.json` - bundled stage-box catalog (59 STAGEBOX entries from
  taskbarhero.wiki/stage-boxes). Merged at load; excluded from inventory listing.
