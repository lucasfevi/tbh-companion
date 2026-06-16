# Decisions (ADR log)

Terse record of architectural decisions. Newest first.

## 2026-06-10 - Diagnostic logging (`electron-log`, main-only writes)

Support logs go to `userData/logs/app.log` (1 MB rotation → `app.old.log`), separate
from optional XP CSV export. **main** uses `createLogger(module)` in `app/src/main/log.ts`;
**core** stays log-free; **renderer** forwards errors via `LOG_RENDERER_ERROR` IPC.
Identical warn/error lines are throttled (5 min) so a bad save path does not flood the
file on every poll. Secrets are redacted before write. Users clear logs from Settings →
Diagnostics. Agent how-to: `docs/DIAGNOSTIC_LOGGING.md`.

## 2026-06-09 - Stage boxes in the `9xxxxx` ItemKey range

The main scraped catalog lists GEAR + MATERIAL only. Saves also reference
**STAGEBOX** loot chests at `910xxx` (Normal Monster Box), `920xxx` (Stage Boss
Box), and `930xxx` (Act Boss Box). These were previously mistaken for hero soul
gear because some ids echo hero digits (`910151`, …); wiki stage-box data
confirms all 59 ids. We ship `data/stage_boxes.json`, merge at load, and **omit
stage boxes from the Inventory tab** (unopened counts remain in `BoxData`).

## 2026-06-09 - Phase 9 inventory improvements

- **Gear Steam variants:** pricing probes hash suffixes `A`–`E` and uses the
  first variant with a cached Steam price (save letter not decoded yet).
- **Material stacks:** `aggregateSaveDatas` Type `0` rows merge when SubKey
  maps to a catalog ItemKey (direct id or `140000 + SubKey % 10000`). Many
  live-save SubKeys (e.g. `10021`) remain unmapped.

## 2026-06-09 - Renderer IPC via `TbhProvider` context

Stats, inventory, and price-progress IPC channels register once in
`renderer/context/TbhProvider.tsx` (parallel initial fetch on mount). Tab
components consume thin hooks (`useStats`, `useInventory`, `usePrices`) instead
of each subscribing to `window.tbh.onStats` / `onInventory` independently.

## 2026-06-09 - CSP tightened for production renderer

`index.html` adds explicit `script-src 'self'`, `connect-src` for Steam market
hosts, and keeps `style-src 'unsafe-inline'` (required for inline styles).
Dev uses the same policy via electron-vite; prod builds disable source maps.

## 2026-06 - Inventory reads `itemSaveDatas` directly, not a slot->item id join

`itemSaveDatas` is the master list of every owned item instance (inventory +
stash + trading + equipped) - verified: all 142 non-empty inventory/stash/
trading slot `ItemUniqueId` refs resolve into it. So we list owned items by
iterating that array and grouping by `ItemKey`.

We deliberately do NOT join slots to instances by `UniqueId`, because those ids
(e.g. `514119247889201000`) exceed JS's safe-integer range; `JSON.parse` rounds
them and distinct ids collide (observed ~6 collisions in 185 items). A
per-location split (inventory vs stash vs trading) would need a lossless
big-int id parse and is deferred until there's a reason to build it.

## 2026-06 - Item catalog with bundled stage boxes and self-refresh

The main item list scrape yields GEAR + MATERIAL whose record `id` equals the
save's `ItemKey`. We bundle it as `data/gamedata.json` (offline fallback), cache
refreshes in `userData`, and re-scrape on a TTL. **Stage boxes** (`910`/`920`/`930`
prefixes) ship separately in `data/stage_boxes.json`. Unknown `ItemKey`s degrade
to `Unknown #<key>` with a refresh hint. See `docs/findings/item-mapping.md`.

## 2026-06 - Steam prices via `priceoverview` in a configurable currency

`priceoverview` reliably honors the `currency` param; `search/render` does not
(it returns a region-fixed currency, verified). Pricing uses `priceoverview`
in `config.currency` (ISO, default USD, also selectable from Settings or Market),
cached per-currency. Background refresh runs on save load (incremental, skips
items priced <24h ago, backs off on HTTP 429). Market tab also has a manual
refresh button. See `docs/findings/steam-market.md`.

## 2026-06 - Inventory valuation: materials + Legendary+ gear only

Steam prices on the Inventory tab target **owned** items only (not the full
~650-item catalog). **Materials** are priced at any grade (1:1 on display name).
**Gear** is priced only at **Legendary and above**; Rare or lower gear is
skipped (low value + ambiguous Steam variant mapping). Gear hashes use
`<name> (<Grade>) <A–E>`; the app probes Steam for the first variant with a
price. Background refresh runs on save load, backs off on HTTP 429 until the
queue finishes, and re-pushes inventory rows as prices arrive.

## 2026-06 - ~~Hero-class items via bundled supplement catalog~~ (superseded)

~~tbh.city/items omits hero-bound `ItemKey`s in the `9xxxxx` range. We ship
`data/hero_items.json` merged into the catalog at load time (names only; not on
Steam).~~ **Superseded 2026-06-09:** the `9xxxxx` gap is **stage boxes**
(STAGEBOX), not hero gear. See `data/stage_boxes.json` and the stage-box ADR above.
`hero_items.json` was removed after incorrect manual entries.

## 2026-06 - Inventory market columns: buy orders, fees, column picker

Inventory shows **Market price** / **List value** (sell-side), **Instant sell** /
**Instant total** (buy-order histogram), plus summary cards for market value,
estimated **After Steam fees**, and instant-sell total. Column visibility persists
in `config.inventoryTable`. Sell-side from `priceoverview` (median + lowest); buy
orders from `itemordershistogram` + bundled `data/steam_item_nameids.json` (tbh-data
`npm run build:steam-nameids`) with **on-demand lazy scrape** for missing ids (same
`bMarketOptOut=1` listing HTML). **No Steam login** for market polling. Gear variants
**A→E** probed at refresh time (stop at first listed letter); display resolve matches.
Market
price column shows median and lowest listing when both differ (e.g. `$15.42`
`($714.15)`); list value still uses median-first `pickMarketUnit`. Orderbook API
spiked and rejected (session-locked currency). TBH fee default ~5% in
`data/steam_market_fee.json` — estimates only; Steam listing UI is authoritative.


Gear prices use `<name> (<Grade>) <letter>` with letters `A`–`E` probed on
Steam at **refresh** time (first listed letter wins). Materials map 1:1 by name. Gear below
Legendary is not priced. Valuation uses `median_price` when available, otherwise
`lowest_price`.

## 2026-06 - Inventory location from slot refs (lossless UniqueId)

Bag/stash/trading counts come from slot `ItemUniqueId`s matched against
`itemSaveDatas` via string parsing (big-int safe). Equipped gear uses
`equippedItemIds` only.

The in-game Records tab (per-stage clear times, chest-drop log) is NOT written
to the save — only progress (`maxCompletedStage`), current chest holdings
(`BoxData`), and lifetime aggregate counters (`aggregateSaveDatas`) persist.
Deriving a durable drop log from save deltas is lossy (save rewrites ~every 2 min;
chests can be opened before `BoxData` updates). **Time-series charts** (XP/hr,
inventory value in SQLite) are also deferred — see `docs/ARCHITECTURE.md`.

## 2026-06 - All-TypeScript (Electron + React) over Python + web UI

The hard part (ES3 decryption + save reverse-engineering) is solved and the
scheme is fully known. Node's built-in `crypto` reproduces it
(PBKDF2-SHA1 + AES-128-CBC) with no native deps. Going single-language removed
the Python venv + FastAPI/WebSocket bridge. The Python prototype (`tbh_xp/`) has
been removed after TS parity; see git history.

## 2026-06 - Electron over Tauri for the desktop shell

Goal was to stop mixing languages. Tauri's shell is Rust, which reintroduces a
second toolchain. Electron is pure JS/TS with the most mature desktop APIs
(always-on-top overlay, multi-window, tray, single-exe packaging). Accepted the
larger bundle (~150MB) as fine for a desktop tool.

## 2026-06 - IPC over a local HTTP server

For a single desktop app the renderer talks to main directly via Electron IPC
(`contextBridge` preload). No need for a local HTTP/WebSocket server just to
reach our own UI.

## 2026-06 - Private GitHub repo

Repo `tbh-companion` starts private. The ES3 password is already public on the
community wiki, but a fan tool that reverse-engineers a game save is kept
private to start; can flip to public later.

## Earlier (Python prototype) - read the save file, not network traffic

TBH is an idle game that computes XP locally, so there is no useful network
traffic to sniff. Reading the local save file is the correct source. Kept as
the foundational decision behind the whole project.
