# TBH Companion

A desktop companion app for the idle game **TBH: Task Bar Hero**. It reads your
local, encrypted save file (read-only) and shows live stats - XP/hour,
gold/hour, per-hero rates, session history - in a full window or a compact
always-on-top mini overlay. Inventory valuation via the Steam Market is planned.

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
```

## Features

- **Live tab** - big XP/hour (held steady between the game's periodic saves,
  not decaying), gold/hour (earned only), session totals, current map, a
  per-hero level + XP/hour breakdown, a "last updated" counter that resets only
  on real XP change, a scrollable history of every XP change, a reset button,
  and an idle warning after 2 minutes.
- **Mini overlay** - a frameless, always-on-top, draggable readout. Toggle it
  from the "Mini" button; the overlay's expand button restores the full window.
- **CSV history** - every XP change is appended to `logs/xp_history.csv` when
  `logHistoryCsv` is enabled.
- **Planned** - Inventory tab (owned items + composition) and Market tab (Steam
  Market valuation). See `docs/findings/`.

## Configuration - `config.json`

| Key | Meaning | Default |
| --- | --- | --- |
| `savePath` | Path to `SaveFile_Live.es3` (env vars allowed) | LocalLow path |
| `es3Password` | ES3 decryption password | the game's built-in password |
| `pollIntervalSeconds` | How often to re-read the save | `5` |
| `rollingWindowMinutes` | Window for the "XP/hour" figure | `5` |
| `trackCubeExp` | Also count Hero-dric Cube XP | `false` |
| `startTopmost` | Start pinned on top | `true` |
| `logHistoryCsv` | Append every XP change to `logs/xp_history.csv` | `true` |

If decryption stops working after a game update, the developer may have rotated
the ES3 password; update `es3Password` and restart. See `docs/SAVE_FORMAT.md`.

## Project layout

```
app/                     # the companion app (Electron + React + TS)
  src/main/              # Electron main: save watcher, config, IPC, windows
  src/preload/           # contextBridge -> window.tbh
  src/core/              # framework-free logic (es3, saveReader, tracker, ...)
  src/renderer/          # React UI (tabs + mini overlay)
  shared/types.ts        # types shared across processes
  test/                  # Vitest unit + integration tests
config.json              # user settings
data/                    # data artifacts (e.g. Steam market catalog snapshot)
docs/                    # architecture, save format, decisions, findings
```

See `AGENTS.md` for the contributor/agent brief.

## Disclaimer

Fan-made, read-only tool. Not affiliated with or endorsed by the developers of
TBH: Task Bar Hero.
