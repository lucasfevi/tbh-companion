# Findings

Research outputs, written as we learn them and committed with the phase that
produced them. Keep each file focused and factual.

- `steam-market.md` - Phase 0 probe of the Steam Market for appid `3678970`:
  endpoints, page-size cap, currency handling, catalog shape, and provider
  implications. Confirmed viable (648 marketable items).
- `item-mapping.md` - the confirmed `ItemKey -> name/rarity/type` source
  (tbh.city embedded JSON; `record.id == save ItemKey`, verified live), the save
  data model, the catalog refresh strategy for game updates, and the remaining
  Steam `market_hash_name` mapping risks (gear variant letter).

Related data artifacts (repo root `data/`):

- `data/gamedata.json` - bundled item catalog snapshot (5,875 items: id, name,
  grade, type, icon, gearId, marketTradable) scraped from tbh.city. Bundled
  fallback for offline/first-run; overridden by the user cache after a refresh.
- `data/steam_market_catalog.json` - snapshot of the 648 marketable item
  names/types/colors/icons (no prices). Seeds the mapping + lets us detect
  non-marketable items offline.
