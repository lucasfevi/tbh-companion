# Architecture

Single-language TypeScript app: an Electron desktop shell hosting a React/Vite
UI. All save-decryption and tracking logic lives in a framework-free `core/`
that is unit-tested independently.

## Processes

```mermaid
flowchart LR
  subgraph main [Electron main - Node]
    Watcher[SaveWatcher]
    Tracking[TrackingService]
    InventorySvc[InventoryService]
    BoxTimers[BoxTimerService]
    Notify[NotificationService]
    Es3[es3 decrypt]
    Parser[parseSnapshot / parseInventory]
    Tracker[XpTracker]
    Market[SteamMarketProvider]
    IPC[registerIpc + broadcast]
  end
  subgraph renderer [Renderer - React/Vite]
    Provider[TbhProvider]
    Live[Live tab]
    Inv[Inventory tab]
    Mkt[Market tab]
    Overlay[Mini overlay]
  end
  SaveFile[(SaveFile_Live.es3)] --> Watcher
  Watcher --> Es3 --> Parser
  Parser --> Tracker
  Parser --> InventorySvc
  Tracking --> IPC
  InventorySvc --> IPC
  IPC --> Provider --> Live
  Provider --> Inv
  Provider --> Mkt
  Market --> InventorySvc
```

Entry bootstrap: `app/src/main/index.ts` (~25 lines) → `app/appState.ts` wires
`TrackingService`, `InventoryService`, and IPC handlers. Window paths live in
`main/paths.ts` only.

## Boundaries

- **main** owns all file system access, decryption, network (Steam), and the
  tracker state. It is the only place secrets/paths are touched.
- **preload** exposes a narrow, typed `window.tbh` API via `contextBridge`
  (channel names from `shared/ipc.ts`). No direct Node access leaks into the
  renderer.
- **renderer** is pure React UI. `TbhProvider` registers one IPC listener per
  channel; tabs consume `useStats` / `useInventory` / `usePrices`.
- **core** (`es3`, `save/snapshot`, `tracker`, `stages`, `heroes`, `gamedata`,
  `inventory/*`) has no Electron/React imports so it can be unit-tested with Vitest.

No local HTTP server: main ↔ renderer communicate over Electron IPC.

## Diagnostic logging

Main process writes support logs to `userData/logs/app.log` via `app/src/main/log.ts`
(`electron-log`, 1 MB rotation). Renderer errors are forwarded through IPC
(`LOG_RENDERER_ERROR`) so users send a single file. **core/** never imports the
logger. See `docs/DIAGNOSTIC_LOGGING.md` for how agents should add logs to new features.

## Windows

Two `BrowserWindow`s load the same Vite bundle on different routes:

- **Full companion window** — resizable, tabbed (Live / Inventory / Market / Chests / Pets /
  Settings / About).
- **Mini overlay** (`/overlay`) — frameless, always-on-top, draggable, compact;
  toggled from the tab bar **Mini** button.
- **Stage chest tracker** (`/box-tracker`) — frameless overlay for tracked cooldown timers;
  opened from the Chests tab or toolbar.

## Notifications

`NotificationService` (main) reads `AppConfig` notification fields:

- **`notificationsEnabled`** — master gate for all notification behavior.
- **`notifyOnUpdateAvailable`** — when enabled, `UpdateService` triggers a Windows OS
  notification (Electron `Notification`) for a new GitHub release; click focuses the main window.
- **`notificationPrefs`** — per-kind sound settings (see `shared/notificationCatalog.ts`):
  - **`chestDrop`** — when a tracked stage boss drops a chest (Player.log or **Dropped** button).
  - **`chestReady`** — when a tracked route's cooldown finishes and **Notify when ready** is on
    for that box (`BoxTimerService` → `showChestReady`).
  - **`heroLevelUp`** — when a hero's level increases between save reads (`TrackingService` →
    `showHeroLevelUp`).

Each kind has `enabled` and `sound` (catalog id or `none`). Sounds play as bundled WAV files via
PowerShell on Windows only; there is no OS toast for these events. Legacy `chestSoundVariant` in
old configs migrates to `notificationPrefs.chestReady` on load.

Per-box **Notify when ready** toggles live in `box_timers.json` (Chests tab), not in `config.json`.
Settings exposes per-kind **Preview sound** over IPC (`preview-notification-sound`).

## Settings persistence

The Settings tab patches `config.json` through IPC on each change (`savePartial` →
`saveConfig` in main). There is no Save/Reset bar. Changing **rolling window (minutes)** still
prompts for confirmation in the renderer because it resets live session stats via `configPatch`.

## Data flow (live stats)

1. `SaveWatcher` notices `SaveFile_Live.es3` mtime changed (poll interval from config).
2. Reads bytes (with a short retry for mid-write sharing violations).
3. `es3.decrypt` → `parseSnapshot` → `SaveSnapshot`.
4. `XpTracker.update(snap)` computes XP/gold/per-hero rates (positive deltas
   only, rates keyed on mtime, held constant between changes) and appends to
   history on change.
5. `TrackingService` pushes `Stats` over IPC; the renderer updates via `TbhProvider`.

## Data flow (inventory)

1. Same save read also runs `parseInventory` (with catalog-aware aggregate merge).
2. `InventoryService.resolveAndPushInventory` resolves rows against `GameDataProvider`
   + Steam price cache, then broadcasts `ResolvedInventory`.
3. Price refresh probes gear variant letters A–E on Steam when needed.

## Tests

Vitest layout mirrors source:

- `test/core/` — pure domain logic
- `test/main/` — config, paths, IPC helpers
- `test/ipc/` — channel parity
- `test/renderer/` — UI helpers
- `test/integration/` — optional local save (`realSave.test.ts`, skipped in CI)

Run `npm run qa` before merge (typecheck + tests + build + bundle guards).
