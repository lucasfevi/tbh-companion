# Item mapping - save ItemKey -> display + Steam price

How to turn the save's numeric item references into named, valued rows.

## The two ends we must bridge

1. **Save side:** `itemSaveDatas` entries carry a numeric `ItemKey` (item type)
   plus `UniqueId`, grade, and enchants. `inventorySaveDatas` / `stashSaveDatas`
   reference items by unique id. The save does **not** store item names.
2. **Steam side:** the market is keyed by `market_hash_name`, a human-readable
   string (see `steam-market.md`). No numeric ItemKey anywhere.

So we need `ItemKey -> {name, rarity, type, icon}` (for display) and then
`{name, rarity} -> market_hash_name` (for pricing).

## Source for ItemKey -> name/rarity/type: the public datamine

A full datamine of the game exists publicly and is the intended source:

- TBH Wiki database - "45 datasets, 25,664 rows" incl. Gear (5,760 items) and
  materials: https://www.taskbarhero.wiki/database
- TBH.City item database: https://tbh.city/items

These expose every item with name, rarity (10 tiers:
Common/Uncommon/Rare/Legendary/Immortal/Arcana/Beyond/Celestial/Divine/Cosmic),
type/slot, level, and drop sources - keyed in a way that should line up with the
save's `ItemKey`.

> Residual task (Phase 4): obtain a machine-readable copy of this table (scrape
> the wiki/tbh.city, or datamine the game's own asset catalog directly) and emit
> `data/gamedata.json` keyed by `ItemKey`. Not done in the spike - only the
> source is confirmed.

## Mapping rule (validated against the live catalog)

Build `market_hash_name` from datamine fields, then validate against the 648
real names in `data/steam_market_catalog.json`:

- **Materials / resources / soulstones** (97 plain names): `market_hash_name ==
  <name>` exactly (e.g. `Iron Ingot`, `Soulstone - Torment`).
- **Gear** (551 names): `market_hash_name == "<Name> (<Rarity>) <Variant>"`,
  e.g. `Tempest Staff (Legendary) A`. Only Legendary+ rarities are marketable;
  lower-rarity gear is never on the market.

Anything that doesn't resolve to a catalog entry is treated as **not
marketable** (value 0).

## Known risks / open questions

- **Gear variant letter** (` A`, ` B`, ...): the trailing token disambiguates
  variants of the same name+rarity. Its meaning (stat-roll tier? base vs
  enchanted?) is not yet confirmed, so `(name, rarity)` alone can be ambiguous
  for gear. Must be resolved from the datamine (likely a per-ItemKey field) in
  Phase 4/5.
- **Duplicate plain names** with different `classid`s appear in the catalog
  (e.g. `Astral Diamond` twice) - confirm whether these are distinct tradable
  variants before collapsing by name.
- Datamine machine-readability not yet verified (no confirmed JSON/API export).

## Valuation pipeline (target)

```
itemSaveDatas (ItemKey, grade, enchants, count)
  -> gamedata.json: ItemKey -> {name, rarity, type, icon}
  -> rule: -> market_hash_name
  -> SteamMarketProvider price map -> unit price
  -> sum(unit price * count) = inventory value
```
