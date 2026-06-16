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
  (~620-650 items; the marketable count drifts as listings come/go) takes ~65
  paged requests. Throttle (~0.9s between) and cache to disk daily.
- **Currency is NOT reliably controllable here.** Re-probed 2026-06:
  `currency=2/3/7` all returned the same USD-formatted prices, i.e. the endpoint
  serves a region/session-fixed currency and ignores the param. Treat
  `search/render` prices as "whatever currency Steam decided" - good for
  discovery and relative value, not for a user-chosen currency.
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

- **Reliably honors `currency`** (`1`=USD, `2`=GBP, `3`=EUR, `7`=BRL, ...).
  Verified 2026-06: same item returned `$0.03` / `R$ 0,16` / `0,03 EUR` for
  currency 1/7/3. Returns `{ success, lowest_price, median_price, volume }` as
  locale-formatted strings (note `,` decimal sep for some currencies).
- One item per call -> rate-limited (expect HTTP 429 if hammered; throttle
  ~1.5-3s/req and back off on 429). **This is our authoritative price source**
  for a user-chosen currency.

## Decision: currency handling

`priceoverview` is the only endpoint that honors a chosen currency, so the app
exposes a **currency setting** (`config.currency`, ISO code, default `USD`) and
prices via `priceoverview` in that currency. The dropdown lists all live Steam
wallet currencies (ECurrency 1–47, excluding legacy SEK/BYN/HRK and non-wallet
ARS). `search/render` is reserved for catalog discovery only. Changing currency
invalidates the cached price set (prices are stored per-currency in
`userData/prices.<ISO>.json`).

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

## Provider implications

- `SteamMarketProvider` prices a list of `market_hash_name`s via `priceoverview`
  in `config.currency`, throttled (~1.5s/req) with 429 back-off, **incremental**
  (skips names priced within a freshness TTL), and **cached** to
  `userData/prices.<ISO>.json`. Refresh is **manual** (a button) because per-item
  pricing is slow; repeated runs only re-price stale/missing names.
- Price target is the user's owned items (once the inventory tab lands); until
  then the refresh can seed against the marketable catalog snapshot.
- Non-marketable items (not present in the catalog) get value 0 / "not
  marketable".

### Buy orders: `market/itemordershistogram`

```
GET https://steamcommunity.com/market/itemordershistogram?norender=1&country=US&language=english&currency=<id>&item_nameid=<numeric>&two_factor=0
```

- Returns `highest_buy_order` / `buy_order_price` (buy side) and `lowest_sell_order` /
  `sell_order_price` (lowest listing — **not** 24h median or volume).
- **Honors `currency` param** (unlike `orderbook`; see spike below).
- Requires **`item_nameid`**. Bundled map: `data/steam_item_nameids.json` from tbh-data
  `npm run build:steam-nameids` (legacy listing HTML via `Cookie: bMarketOptOut=1`).
  Bundle is **partial** (gear **A** letters + materials); companion fills gaps at refresh
  time with the same scrape (`SteamItemNameIdService` → `userData/steam_item_nameids.json`).
  tbh-data `build:steam-nameids` should emit **A-only** gear hashes (non-A rows are stale).
- Gear uses market hash suffix **A** only at refresh; `priceoverview` and histogram run on
  that hash. After upgrading from multi-variant probing, **force refresh** (Inventory toolbar
  or delete `userData/prices.<currency>.json`) to drop cached B–E rows.
- Set `Referer` to the item listing URL; throttle like `priceoverview`.

**Companion refresh:** `priceoverview` (median + lowest + volume) then histogram when
`item_nameid` is known. Market price column shows **both** median and lowest when they
differ; list value / totals still prefer median via `pickMarketUnit`.

### `market/orderbook` — spiked, not used (2026-06-14)

```
GET https://steamcommunity.com/market/orderbook?q=Load&qp=[3678970,"Wood"]
```

No `item_nameid`, but **`eCurrency` is session/region-locked** — not controllable like
`priceoverview`. From Brazil, always `eCurrency: 7` (BRL) regardless of `currency` /
`country` query params or `steamCountry=US` cookie. Default companion config is USD, so
orderbook buy orders would not match sell prices from `priceoverview`. **Rejected** in
favor of histogram + tbh-data nameid map.

### TBH market fee (estimate)

Sample from `search/render`: `sell_price_text` R$ 1,01 vs `sale_price_text` R$ 0,96
≈ **5%** total (not the CS2-style 15%). Bundled in `data/steam_market_fee.json`;
Inventory shows net-after-fees as an **estimate** — Steam listing UI is authoritative.
