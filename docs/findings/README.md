# Findings

Research outputs, written as we learn them and committed with the phase that
produced them. Keep each file focused and factual.

- `steam-market.md` - Phase 0 probe of the Steam Market for appid `3678970`:
  endpoints, page-size cap, currency handling, catalog shape, and provider
  implications. Confirmed viable (648 marketable items).
- `item-mapping.md` - Phase 0 rule for `ItemKey -> name/rarity/type -> Steam
  market_hash_name`, the datamine source, and the open risks (gear variant
  letter, datamine machine-readability).

Related data artifacts (repo root `data/`):

- `data/steam_market_catalog.json` - snapshot of the 648 marketable item
  names/types/colors/icons (no prices). Seeds the mapping + lets us detect
  non-marketable items offline.
