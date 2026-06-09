# Steam Market probe - TBH (appid 3678970)

Spike to confirm we can value inventory items via the Steam Community Market.
Probed 2026-06 against `steamcommunity.com`.

## Verdict

Viable. TBH has a real Community Market with **648 marketable items**. We can
fetch the whole catalog and per-item prices without auth.

## Endpoints

### Bulk catalog + prices: `market/search/render`

```
GET https://steamcommunity.com/market/search/render/?appid=3678970&norender=1&count=100&start=<n>
```

- Returns JSON: `{ success, total_count, pagesize, start, results: [...] }`.
- **Page size is hard-capped at 10** regardless of `count`. The full catalog
  (648 items) takes ~65 paged requests. Throttle (~0.9s between) and cache to
  disk daily. A full clean pass took ~80s with no rate-limiting at that pace.
- Currency is **region-based** (returned BRL/R$ here), not controllable via the
  `currency` param on this endpoint.
- Each result:

```jsonc
{
  "name": "Soulstone - Torment",
  "hash_name": "Soulstone - Torment",      // == market_hash_name
  "sell_listings": 53018,
  "sell_price": 101,                        // integer, minor units (cents)
  "sell_price_text": "R$ 1,01",
  "sale_price_text": "R$ 0,96",
  "asset_description": {
    "appid": 3678970,
    "classid": "8507091135",
    "icon_url": "<relative>",               // see icon URL below
    "tradable": 1,
    "name": "Soulstone - Torment",
    "name_color": "00F6FF",                 // rarity color (hex)
    "type": "Soulstone",                    // e.g. "Staff - Lv. 80"
    "market_hash_name": "Soulstone - Torment",
    "commodity": 1                          // 1 = fungible/stackable
  }
}
```

- **Icon URL:** `https://community.fastly.steamstatic.com/economy/image/<icon_url>`.

### Per-item price (currency-controllable): `market/priceoverview`

```
GET https://steamcommunity.com/market/priceoverview/?appid=3678970&currency=<id>&market_hash_name=<name>
```

- Honors `currency` (`1`=USD, `7`=BRL, ...). Returns
  `{ success, lowest_price, median_price, volume }` as formatted strings.
- One item per call -> rate-limited. Use only for on-demand single lookups in a
  chosen currency; use `search/render` for bulk.

## Catalog shape (snapshot in `data/steam_market_catalog.json`)

648 items: **551 gear** (rarity in the name) + **97 plain-named**
materials/resources/soulstones.

- Marketable gear rarities only: Immortal (175), Legendary (159), Arcana (115),
  Beyond (65), Celestial (23), Divine (11), Cosmic (3). The lower rarities
  (Common/Uncommon/Rare) from the full 5,760-item gear DB are **not** on the
  market.
- Type prefixes (gear slots): Helmet, Armor, Shield, Staff, Gloves, Sword,
  Tome, Axe, Scepter, Orb, Boots, Amulet, Bow, ... plus material types
  (Decoration Material, Engraving Material, Crafting Material).
- `name_color` encodes rarity (e.g. `EBBB00` legendary gold, `00F6FF` soulstone
  cyan).

## Provider implications (Phase 5)

- `SteamMarketProvider` pages `search/render` (10/page, ~0.9s throttle) into a
  name -> price map, cached to disk with a daily TTL.
- Currency: store the region currency from the snapshot; offer USD via
  `priceoverview` on demand if needed.
- Non-marketable items (not present in the catalog) get value 0 / "not
  marketable".
