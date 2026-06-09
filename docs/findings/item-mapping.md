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

## Save data model (confirmed from a live save)

```
itemSaveDatas:      179 entries  { ItemKey, UniqueId, IsChaotic, IsBlocked,
                                   EnchantCount[3], EnchantData[6], ... }
inventorySaveDatas: 260 slots    { Index, ItemUniqueId, IsUnlock }
stashSaveDatas:     343 slots    { Index, ItemUniqueId, IsUnLock }
tradingStashSaveDatas: ...       (same shape)
```

Resolution: `inventory/stash slot.ItemUniqueId -> itemSaveDatas[].UniqueId ->
ItemKey -> gamedata`. Items are **per-instance** (each gear piece is its own
row with its own enchants), not stacked-with-count.

> Materials (Iron Ingot, etc.) did not appear in this save's `itemSaveDatas`;
> stackable materials are likely stored elsewhere (`aggregateSaveDatas` /
> `BoxData` - not yet decoded). Gear valuation works from `itemSaveDatas` today;
> material quantities are a follow-up.

## Source for ItemKey -> name/rarity/type: tbh.city (CONFIRMED, machine-readable)

`https://tbh.city/items` server-renders a **complete JSON item catalog** inside
its Next.js RSC stream. Scraped 2026-06: **5,875 items** (5,760 GEAR + 115
MATERIAL). Each record:

```json
{ "id": 322111, "name": { "en": "Void Staff" }, "grade": "RARE",
  "type": "GEAR", "icon": "sprites/sharedassets0/SWORD_322111.png",
  "gear_id": "322111", "is_market_tradable": false }
```

**The join is `record.id === save ItemKey`.** Verified against a live save:
`322111 -> Void Staff (RARE GEAR)`, `601111 -> Emerald Amulet (UNCOMMON GEAR)`,
`141002 -> Iron Ingot (UNCOMMON MATERIAL)`. The record also carries
`is_market_tradable`, so we know offline which items can ever have a price
(3,593 of 5,875 are tradable).

How we consume it:

- `app/src/core/gamedata.ts` - `extractItemsFromHtml()` unescapes the page,
  bracket-matches the `[{"id":...}]` array, and normalizes to
  `{ id, name, grade, type, icon, gearId, marketTradable }`. Pure + unit-tested.
- `app/src/main/gameDataProvider.ts` - loads a snapshot, indexes by `id`, and
  can re-scrape.
- `data/gamedata.json` - bundled snapshot (5,875 items, ~900 KB) shipped with
  the app so inventory resolves offline and on first run.

> The wiki (`taskbarhero.wiki/gear`, an 8.4 MB server-rendered table) is a viable
> backup source but is heavier and not as cleanly structured as tbh.city's JSON.

## Refresh strategy (game updates / new items)

The game ships new items in patches, so the catalog must self-update without an
app release:

1. **Bundled fallback** (`data/gamedata.json`) guarantees a working baseline
   offline.
2. **User cache** in `userData/gamedata.json` overrides the bundle once fetched.
3. On startup the provider loads cache (else bundle) and, if the snapshot is
   older than the TTL (7 days), **re-scrapes in the background**. A manual
   "Refresh game data" action (IPC `gamedata-refresh`) forces it.
4. **Unknown ItemKeys degrade gracefully:** an item in the save that isn't in
   the catalog (e.g. added by a patch newer than the snapshot) renders as
   `Unknown #<key>` and the UI surfaces a "N unknown items - refresh game data?"
   hint rather than crashing or hiding the item.
5. Refresh is **validated before commit**: a fetch yielding zero items is
   rejected and the previous snapshot is kept, so a layout change on tbh.city
   can't wipe the catalog.

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
