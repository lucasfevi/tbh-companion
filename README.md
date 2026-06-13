# TBH Companion

A desktop companion app for the idle game **TBH: Task Bar Hero**. It reads your
local, encrypted save file (read-only) and shows live stats - XP/hour,
gold/hour, per-hero rates, session history - in a full window or a compact
always-on-top mini overlay. Inventory valuation uses live Steam Market prices.

Built with **Electron + React + TypeScript**. It only **reads** your own local
save to display statistics; it never modifies the save or talks to the game or
its servers.

## Website

Single-page landing with download link, GitHub stats, and feature overview:
**https://lucasfevi.github.io/tbh-companion/**

Preview locally without deploying (serves `website/` over HTTP — required for stats API and `data/release.json`):

```
npx --yes serve website -p 4173
```

Then open **http://localhost:4173** and hard-refresh. Do not open `index.html` directly (`file://`) — the browser blocks fetches to GitHub and local JSON.

The download button uses [`website/data/release.json`](website/data/release.json) first (direct `.exe` link), then refreshes from the GitHub API when available. Stars and total downloads still come from the GitHub API.

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

Shipping a Windows build is two Actions steps (see `.github/workflows/`):

1. **Release prepare** (`release-prepare.yml`) — Actions → **Release prepare** → Run workflow → enter semver **without** `v` (e.g. `1.0.2`). This bumps `app/package.json`, syncs the lockfile, commits to `main`, and pushes tag `v1.0.2`.
2. **Release** (`release.yml`) — runs automatically when a `v*` tag is pushed. It runs QA, builds the NSIS installer, and publishes a GitHub Release with install/upgrade notes.

The release tag **must match** `app/package.json` exactly (package `1.0.2` → tag `v1.0.2`). CI fails if they differ.

**Advanced (manual):** merge to `main`, bump `app/package.json`, run `npm install` in `app/`, commit, then `git tag vX.Y.Z` and `git push origin vX.Y.Z`.

**Rebuild an existing tag:** Actions → **Release** → Run workflow → enter the tag (e.g. `v1.0.1`).

CI uploads the NSIS installer plus `latest.yml` and `.blockmap` so the installed app can update itself from GitHub Releases (see **About** tab). Builds are unsigned — Windows SmartScreen may prompt **Run anyway** on install and after an update.

## Features

- **Live tab** — XP/hour (held steady between the game's periodic saves), gold/hour,
  session totals, current map, per-hero level + XP/hour breakdown, XP change history,
  session reset, and idle warning after 2 minutes.
- **Global save bar** — "Save written X ago" shared by all tabs (distinct from the
  Live tab's XP timer). Save watch status and errors appear in the bar under the tab strip.
- **Mini overlay** — frameless always-on-top readout with XP/gold rates, map, priced
  inventory total, and pricing status. Open from the **Mini** toolbar button or tray menu.
- **Inventory tab** — owned items resolved against bundled catalogs, grouped by type with
  composition stats, search/filter/sort, Steam price + value columns, location breakdown,
  and graceful handling of unknown items after game updates.
- **Market tab** — pick a currency and refresh Steam prices (background job on save load;
  backs off on rate limits until done).
- **Chests tab** — unopened chest slots (common, stage boss, act boss), capacity from
  base slots plus rune nodes and settings bonuses, with progress bars per category.
- **Stage boss chest tracker** — per-level cooldowns and farm stages on the Chests tab;
  always-on-top overlay with ready/cooling timers; mark **Dropped** manually or auto-detect
  from **Player.log** when a stage boss chest drops. Per-level **Notify when ready** toggles
  play a sound cue when a cooldown finishes (no OS toast).
- **Notifications** — master toggle in **Settings**; optional Windows notification when an
  app update is available; chest-ready alerts are sound-only (Soft chime, Double tap, Wood tick,
  Whisper ping, or None) with **Preview sound** to try a variant.
- **Pets tab** — companion unlock progress from your save, passive bonuses, kill targets,
  best farm stages, and where each monster appears.
- **About tab** — installed version, links to GitHub and release notes, and in-app updates
  from GitHub Releases (background check ~30s after startup; download/install only when you
  confirm in About).
- **Settings tab** — edit `config.json` (save path, poll interval, rolling window, currency,
  notifications, CSV logging, always-on-top). Changes save automatically; changing the rolling
  window confirms first because it resets the session.
- **Session restore** — live stats and rolling history resume after restart when your save
  and tracking settings are unchanged; Mini and stage chest tracker reopen if they were open
  when you quit.
- **CSV history** — every XP change appended to `logs/xp_history.csv` when `logHistoryCsv`
  is enabled.

## Configuration - `config.json`

Editable from the **Settings** tab or by hand. Stored under the app user-data folder.

| Key | Meaning | Default |
| --- | --- | --- |
| `savePath` | Path to `SaveFile_Live.es3` (env vars allowed) | LocalLow path |
| `es3Password` | ES3 decryption password | the game's built-in password |
| `pollIntervalSeconds` | How often to re-read the save | `5` |
| `rollingWindowMinutes` | Window for the "XP/hour" figure | `5` |
| `startTopmost` | Keep main window on top | `true` |
| `logHistoryCsv` | Append every XP change to `logs/xp_history.csv` | `true` |
| `currency` | ISO code for Steam Market prices (`USD`, `EUR`, `BRL`, ...) | `USD` |
| `notificationsEnabled` | Master switch for update toasts and in-app notification sounds | `true` |
| `notifyOnUpdateAvailable` | Windows notification when a newer release is available | `true` |
| `notificationPrefs` | Per-kind sound alerts: `chestDrop`, `chestReady`, `heroLevelUp` — each `{ enabled, sound }` where `sound` is a catalog id (see Settings) or `none` | see defaults in `shared/notificationCatalog.ts` |

Legacy installs may still have `chestSoundVariant`; it is migrated to `notificationPrefs.chestReady` on first load and removed on save.

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

See `AGENTS.md` (Cursor) and `CLAUDE.md` (Claude Code) for the contributor/agent brief. Project skills live in `.cursor/skills/` and are mirrored to `.claude/skills/` via `npm run sync:skills`.

## Disclaimer

Fan-made, read-only tool. Not affiliated with or endorsed by the developers of
TBH: Task Bar Hero.
