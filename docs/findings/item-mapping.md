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

> Materials appear in both `itemSaveDatas` (instances) and, for stack counts,
> `aggregateSaveDatas` Type `0` rows when SubKey maps to a catalog ItemKey (see
> `core/inventory/aggregates.ts`). Many SubKeys (e.g. `10021`) are still undecoded.
> Gear is per-instance in `itemSaveDatas`; location comes from slot refs only
> (`equippedItemIds`, inventory/stash/trading slots).

## Source for ItemKey -> name/rarity/type/level

The bundled main catalog (`data/gamedata.json`, source label
`companion-item-catalog`) is exported from **tbh-data** and shipped with each app
release. Each normalized row:

```json
{ "id": 322111, "name": "Void Staff", "grade": "RARE", "type": "GEAR",
  "level": 50, "marketTradable": false }
```

**The join is `record.id === save ItemKey`.** Verified against a live save:
`322111 -> Void Staff (RARE GEAR)`, `601111 -> Emerald Amulet (UNCOMMON GEAR)`,
`141002 -> Iron Ingot (UNCOMMON MATERIAL)`. Gear **level** is included in the
bundled snapshot from tbh-data (not derived from digits in the ItemKey).

How we consume it:

- `app/src/core/gamedata.ts` — normalize rows to `{ id, name, grade, type, level, marketTradable }`.
- `app/src/main/gameDataProvider.ts` — loads bundled gamedata + merges stage boxes, indexes by `id`. **Throws at startup** if `gamedata.json` is missing or invalid.
- `data/gamedata.json` — bundled GEAR + MATERIAL snapshot (~900 KB), required in dev and in `resources/data/` for packaged installs.
- `data/stage_boxes.json` — bundled **59 STAGEBOX** entries (see below).

> Stage boxes and gear tables are also documented on the wiki
> ([taskbarhero.wiki/stage-boxes](https://taskbarhero.wiki/stage-boxes), `/gear`).

## Catalog updates (game patches / new items)

The game ships new items in patches. The companion updates the catalog via **app
releases**, not runtime fetch:

1. **tbh-data** exports an updated `gamedata.json` for the game version (see
   `docs/agent/PULL-REQUEST.md`).
2. **Bundled in the app** — `data/gamedata.json` is copied to `dist/data/` at
   build time and shipped in the installer as `resources/data/gamedata.json`.
3. **Fail-fast** — if bundled gamedata is missing or empty, the app does not start.
4. **Unknown ItemKeys** — save keys not yet in the bundled snapshot render as
   `Unknown #<key>` (informational banner in Inventory). Ship a new app version
   with updated `data/gamedata.json` to resolve them.

## Stage boxes (`910xxx`–`930xxx`) — confirmed STAGEBOX, not hero gear

The main GEAR + MATERIAL list **omits STAGEBOX** types. Live saves still carry
opened stage-box instances in `itemSaveDatas` with ItemKeys in the `9xxxxx`
range. These were previously misread as hero-class soul gear because some ids
embed hero digits (`910151`, `910201`, …) — that correlation was **wrong**.

Confirmed mapping (59 entries, [taskbarhero.wiki/stage-boxes](https://taskbarhero.wiki/stage-boxes)):

| Prefix | Type | Grade | Examples |
| --- | --- | --- | --- |
| `910xxx` | Normal Monster Box | COMMON | `910151` → Normal Monster Box Lv15 |
| `920xxx` | Stage Boss Box | RARE | `920501` → Stage Boss Box Lv50 |
| `930xxx` | Act Boss Box | LEGENDARY | `930301` → Act Boss Box Lv30 |

Bundled in `data/stage_boxes.json` (`app/src/core/stageBoxes.ts`). Merged into
the lookup index at load; **excluded from the Inventory tab** (not gear/materials
to value). Unopened chest counts stay in `BoxData` (`BoxTypes` / `BoxQuantity`).
Stage-box rows in `itemSaveDatas` that are not in a slot array have location
`unknown` in parse — they never appear in the inventory grid.

## Mapping rule

Build `market_hash_name` from gamedata fields; `priceoverview` confirms the listing:

- **Materials / resources / soulstones**: `market_hash_name == <name>` exactly.
- **Gear** (Legendary+ tradable only): `"<Name> (<Rarity>) A"` (save letter not
  decoded yet; non-A Steam suffixes are not probed — B listings were often phantom).

If Steam returns no price for that hash, the row shows no value (exact grade only,
no cross-grade fallback).

## Gotcha: JSON files must be BOM-free

`data/gamedata.json` and bundled JSON catalogs were first written via
PowerShell `Set-Content -Encoding UTF8`, which prepends a UTF-8 **BOM** that
breaks `JSON.parse` ("Unexpected token '\uFEFF'"). Both were rewritten BOM-free,
and the providers now strip a leading BOM defensively. When regenerating these,
use `[System.IO.File]::WriteAllText($p,$txt,(New-Object System.Text.UTF8Encoding($false)))`
or Node `fs.writeFileSync` (never `Set-Content -Encoding UTF8` on PS 5.1).

## Known risks / open questions

- **Gear variant letter** (` A`, ` B`, ...): save field not decoded; pricing and
  links use **`A` only**. Per-instance letter from datamine would improve accuracy.
- **aggregateSaveDatas SubKeys**: Type `0` encoding partly mapped; many live-save
  SubKeys still unknown (see `SAVE_FORMAT.md`).
- **Duplicate plain names** with different `classid`s appear in the catalog
  (e.g. `Astral Diamond` twice) — confirm whether these are distinct tradable
  variants before collapsing by name.

## Valuation pipeline (implemented)

```
itemSaveDatas + aggregateSaveDatas (material stacks)
  -> parseInventory / resolveInventory (core/inventory/*)
  -> gamedata.json + stage_boxes.json: ItemKey -> {name, grade, type, level}
  -> (stage boxes filtered out of inventory rows)
  -> marketHashCandidates -> SteamMarketProvider price cache
  -> sum(unit price * count) on Inventory tab
```
