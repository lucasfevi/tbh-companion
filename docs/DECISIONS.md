# Decisions (ADR log)

Terse record of architectural decisions. Newest first.

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

## 2026-06 - Item catalog scraped from tbh.city, with a self-refresh path

`tbh.city/items` server-renders a complete JSON item catalog whose record `id`
equals the save's `ItemKey` (verified live). We extract + bundle it as
`data/gamedata.json` (offline fallback), cache refreshes in `userData`, and
re-scrape on a TTL so game patches add items without an app release. Unknown
`ItemKey`s degrade to `Unknown #<key>` with a refresh hint. See
`docs/findings/item-mapping.md`.

## 2026-06 - Steam prices via `priceoverview` in a configurable currency

`priceoverview` reliably honors the `currency` param; `search/render` does not
(it returns a region-fixed currency, verified). So pricing uses `priceoverview`
in `config.currency` (ISO, default USD, also selectable from the Market tab),
cached per-currency. Refresh is manual (a button) because per-item pricing is
slow + rate-limited; it's incremental (skips items priced <24h ago) and backs
off on HTTP 429. See `docs/findings/steam-market.md`.

## 2026-06 - No "Records" tab from the save (records are session-only)

The in-game Records tab (per-stage clear times, chest-drop log) is NOT written
to the save - only progress (`maxCompletedStage`), current chest holdings
(`BoxData`), and lifetime aggregate counters (`aggregateSaveDatas`, no
timestamps) persist. We could derive our own durable log from save deltas, but
the save only rewrites ~every 2 min, so chest drops can be opened before we
observe the `BoxData` delta -> lossy. Parked until a reliable design exists.

## 2026-06 - All-TypeScript (Electron + React) over Python + web UI

The hard part (ES3 decryption + save reverse-engineering) is solved and the
scheme is fully known. Node's built-in `crypto` reproduces it
(PBKDF2-SHA1 + AES-128-CBC) with no native deps, so the only reason to stay on
Python is gone. Going single-language removes the Python venv + FastAPI/
WebSocket bridge and ships one runtime. Decision: port `core/` to TypeScript;
keep `tbh_xp/` as a reference until parity, then remove it.

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
