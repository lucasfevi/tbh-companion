# TBH Companion

A desktop companion app for the idle game **TBH: Task Bar Hero**. It reads your
local, encrypted save file (read-only) and shows live stats - XP/hour,
gold/hour, per-hero rates, session history - in a full window or a compact
always-on-top mini overlay. Inventory valuation uses live Steam Market prices.

Built with **Electron + React + TypeScript**. It only **reads** your own local
save to display statistics; it never modifies the save or talks to the game or
its servers.

## Quick start

```
cd app
npm install
npm run dev      # run in development (hot reload)
```

If `npm install` doesn't fetch Electron's binary, run
`node node_modules/electron/install.js` (see `AGENTS.md` for the manual fallback).

Build and package:

```
npm run build    # production bundle into out/
npm run pack     # unpacked app into release/win-unpacked
npm run dist     # Windows NSIS installer into release/
npm run typecheck
npm test
npm run qa       # typecheck + test + build (run before marking done)
npm run qa:dev   # dev server smoke when UI is not visible
```

## Releases

Pushing a version tag builds the Windows NSIS installer and publishes a GitHub
Release (see `.github/workflows/release.yml`).

1. Merge fixes to `main`.
2. Tag and push: `git tag v0.1.1` then `git push origin v0.1.1`.

The **tag** sets the build version at release time (`npm version` in CI), so the
installer name updates even if `app/package.json` on `main` still says an older
semver. After shipping, bump `version` in `app/package.json` on `main` so local
dev matches the latest release.

You can also trigger a release manually from the Actions tab (`workflow_dispatch`)
with a tag like `v0.1.1`.

## Features

- **Live tab** - big XP/hour (held steady between the game's periodic saves,
  not decaying), gold/hour (earned only), session totals, current map, a
  per-hero level + XP/hour breakdown, an "XP updated" counter (resets only on
  real XP change), a scrollable history of every XP change, a reset button,
  and an idle warning after 2 minutes.
- **Global save bar** - "Save written X ago" shared by all tabs (distinct from
  the Live tab's XP timer).
- **Mini overlay** - frameless always-on-top readout with XP/gold rates, map,
  priced inventory total, and pricing status. Toggle from **Mini** in the tab bar.
- **CSV history** - every XP change is appended to `logs/xp_history.csv` when
  `logHistoryCsv` is enabled.
- **Inventory tab** - owned items from the save resolved against bundled catalogs
  (`data/gamedata.json` + `data/stage_boxes.json`, main list self-refreshing on a
  TTL), grouped by type with composition stats, search/filter/sort (grade, type,
  location, tradable, in-use), Steam price + value columns (materials + Legendary+
  gear), location breakdown (inventory / stash / trading / equipped), and graceful
  handling of unknown items after game updates.
- **Market tab** - pick a currency and refresh Steam prices (background job on
  save load; backs off on rate limits until done).
- **Settings tab** - edit `config.json` (save path, poll interval, rolling window,
  currency, cube XP, CSV logging, always-on-top). Warns before settings that reset the session.

## Configuration - `config.json`

Editable from the **Settings** tab or by hand. Stored under the app user-data folder.

| Key | Meaning | Default |
| --- | --- | --- |
| `savePath` | Path to `SaveFile_Live.es3` (env vars allowed) | LocalLow path |
| `es3Password` | ES3 decryption password | the game's built-in password |
| `pollIntervalSeconds` | How often to re-read the save | `5` |
| `rollingWindowMinutes` | Window for the "XP/hour" figure | `5` |
| `trackCubeExp` | Also count Hero-dric Cube XP | `false` |
| `startTopmost` | Keep main window on top | `true` |
| `logHistoryCsv` | Append every XP change to `logs/xp_history.csv` | `true` |
| `currency` | ISO code for Steam Market prices (`USD`, `EUR`, `BRL`, ...) | `USD` |

If decryption stops working after a game update, the developer may have rotated
the ES3 password; update `es3Password` and restart. See `docs/SAVE_FORMAT.md`.

## Project layout

```
app/                     # the companion app (Electron + React + TS)
  src/main/              # Electron main: save watcher, config, IPC, windows
  src/preload/           # contextBridge -> window.tbh
  src/core/              # framework-free logic (es3, save/snapshot, inventory/*, ...)
  src/renderer/          # React UI (tabs + mini overlay; TbhProvider for IPC state)
  shared/types.ts        # types shared across processes
  test/core/             # Vitest — domain logic
  test/main/             # main process helpers
  test/ipc/              # IPC channel parity
  test/renderer/         # UI helpers
  test/integration/      # optional local save tests
config.json              # default settings (overridden by userData copy)
data/                    # bundled catalogs (gamedata.json, stage_boxes.json)
docs/                    # architecture, save format, decisions, findings
```

See `AGENTS.md` for the contributor/agent brief.

## Disclaimer

Fan-made, read-only tool. Not affiliated with or endorsed by the developers of
TBH: Task Bar Hero.
