# AGENTS.md - TBH Companion

Brief for any agent or contributor picking this up cold. Read `docs/` before
touching decryption or item mapping.

## What this is

A companion app for the idle game **TBH: Task Bar Hero**. It reads the game's
local, encrypted save file (read-only) and shows live stats: XP/hour, gold/hour,
per-hero rates, session history, and (later) inventory valuation via the Steam
Market. It never modifies the save and never talks to the game servers.

## Where things are

- `app/` - the companion app (Electron + React + TypeScript). This is the
  target codebase.
  - `app/src/main/` - Electron main process (Node): file watching, decryption,
    tracking, IPC. Owns all file/network access.
  - `app/src/preload/` - `contextBridge` exposing a typed `window.tbh` API.
  - `app/src/core/` - framework-free, unit-tested logic ported from Python
    (`es3`, `saveReader`, `tracker`, `stages`, `heroes`, `gamedata`).
  - `app/src/renderer/` - React UI (tabs + mini overlay). Pure UI, no Node APIs.
  - `app/shared/types.ts` - types shared across processes.
- `tbh_xp/` - the original Python tool. **Reference only**, kept until the TS
  core reaches parity, then removed. Do not add features here.
- `docs/` - the knowledge base (see below).
- `config.json` - user settings, reused by the app.

## Build / run / test

The app lives under `app/` (created during the scaffold phase):

```
cd app
npm install
npm run dev        # electron-vite dev (main + renderer with HMR)
npm run build      # production bundle (out/)
npm run typecheck  # tsc --noEmit
npm test           # vitest (core logic)
npm run pack       # electron-builder --dir -> release/win-unpacked (no installer)
npm run dist       # electron-builder -> Windows NSIS installer
```

## Windows environment - check this FIRST

This project is developed and run on **Windows + PowerShell**. When something
behaves oddly, suspect the environment (encoding, paths, line endings, file
locking, shell) BEFORE assuming a logic bug - several "bugs" here turned out to
be Windows/PowerShell quirks. Known ones:

- **JSON must be BOM-free.** PowerShell 5.1 `Set-Content -Encoding UTF8` writes a
  UTF-8 **BOM** that breaks `JSON.parse` ("Unexpected token '\uFEFF'"). This
  silently broke the bundled `data/*.json` catalogs. To write JSON use Node
  `fs.writeFileSync`, or
  `[System.IO.File]::WriteAllText($p,$txt,(New-Object System.Text.UTF8Encoding($false)))`.
  Readers strip a leading BOM defensively, but don't rely on it.
- **Shell is PowerShell, not bash.** Chain commands with `;` (not `&&`); quote
  paths with spaces (the repo path has one); heredocs don't work - pass commit
  messages with multiple `-m` flags.
- **`Invoke-WebRequest` hangs/parses slowly** on large HTML in PS 5.1 (legacy DOM
  parsing). Always pass `-UseBasicParsing`.
- **Save file is locked / atomically rewritten** by the game while playing. Reads
  can hit sharing violations or catch a mid-write (ciphertext length not % 16) -
  retry briefly and treat as transient (see `readBytesShared`).
- **Paths use `%USERPROFILE%\AppData\LocalLow\...`** and `userData` is under
  `%APPDATA%`. Expand env vars (`expandPath`); never hard-code a home dir.
- **Line endings:** keep files LF; avoid tools that rewrite to CRLF.
- **Electron binary:** if `npm install` doesn't fetch it (some sandboxes block
  the postinstall extraction), run `node node_modules/electron/install.js`, or
  download the matching `electron-v<ver>-win32-x64.zip` and extract it into
  `node_modules/electron/dist/` with `path.txt` containing `electron.exe`.
- **Big numbers:** save ids like `UniqueId` exceed JS safe-integer range and
  collide after `JSON.parse`; parse losslessly (string/bigint) if you must use
  them. (Not Windows-specific, but a recurring "why don't these match" trap.)

The app has two windows sharing one bundle: the full tabbed companion (`#main`)
and a frameless always-on-top mini overlay (`#overlay`). Toggle from the "Mini"
button in the tab bar; restore from the overlay's expand button.

The legacy Python tool (for parity checks only):

```
.venv/Scripts/python.exe -m tbh_xp           # run overlay
.venv/Scripts/python.exe -m tbh_xp.selftest  # headless decrypt + dump
```

## Conventions

- TypeScript everywhere in `app/`. Keep `core/` free of Electron/React imports
  so it stays unit-testable.
- Commit style: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`,
  `refactor:`). One focused commit per phase / big change; push to `origin`
  after each phase. Never force-push.
- Never commit personal save data (`*.es3`, decrypted dumps, `sample/`).

## Docs index

- `docs/ARCHITECTURE.md` - processes, IPC boundary, windows, data flow.
- `docs/SAVE_FORMAT.md` - ES3 decryption scheme + save JSON layout.
- `docs/DECISIONS.md` - short ADR log of why the stack is what it is.
- `docs/findings/` - research outputs (Steam Market probe, item mapping).
