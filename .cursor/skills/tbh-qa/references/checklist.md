# TBH Companion — QA checklist (detail)

Use with `.cursor/skills/tbh-qa/SKILL.md`. Check only what your change touches.

## Automated (Step 1)

| Command | Expect |
|---------|--------|
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 (errors block; warnings OK) |
| `npm run format:check` | exit 0 |
| `npm test` | all files green (includes `test/main/paths.test.ts`, `test/ipc/channels.test.ts`) |
| `npm run qa` | above + build + no `../../preload` in `out/main/index.js` |
| `npm run qa:dev` | dev starts, Vite responds, no build errors in log (when UI not visible) |

## Dev smoke (Steps 2–3)

### Main window (`#main`)

- [ ] Tab bar: Live, Inventory, Market, Settings, Mini
- [ ] Save status bar under tabs
- [ ] Live tab: session stats or "Connecting to the save file…"
- [ ] Switch each tab once — no white screen / ErrorBoundary crash

### With save file present

Default path (Settings):  
`%USERPROFILE%\AppData\LocalLow\TesseractStudio\TaskbarHero\SaveFile_Live.es3`

- [ ] Save bar shows "Save written …" within poll interval
- [ ] Live: XP/gold rates update after game writes save
- [ ] Inventory: rows or empty state with filters (not perpetual loading)

### Overlay (`#overlay`)

- [ ] Mini button opens small always-on-top window
- [ ] Expand returns to main window

### Settings (if touched)

- [ ] Tab loads config fields
- [ ] Save settings → success message
- [ ] Changing rolling window / Cube XP → confirm dialog appears
- [ ] Changing currency → inventory prices refresh (not stale currency)

## Known failure modes

### Blank main window

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Dark empty window, no tabs | Preload failed to load | Fix path in `main/paths.ts` — use `../preload/index.js` |
| Instant white flash then blank | Renderer JS error | DevTools console; fix import/path |
| "Settings API not loaded" | Stale preload after IPC change | Full quit + restart `npm run dev` |

**Verify bundle after main changes:**

```powershell
Select-String -Path app/out/main/index.js -Pattern "preload/index"
# Expect: join(__dirname, "../preload/index.js")
# Fail:   join(__dirname, "../../preload/index.js")
```

### Tests pass but app broken

Common when only unit tests ran:

- Main process paths wrong (bundled `__dirname` is `out/main/`, not source subfolders)
- IPC channel string drift (main vs preload vs `shared/ipc.ts`)
- Renderer importing `node:fs` or main-only modules

## IPC / config regression spots

From `docs/reviews/playtest-bugs.md` — re-test when editing these:

- Settings currency → must call `ensureOwnedPrices(true)` (`configPatch.ts`)
- CSV logging toggle → `tracker.onHistory` without recreating tracker
- Session reset → confirm before rolling window / Cube XP change (`Settings.tsx`)

## Windows dev notes

- Use `npm.cmd` if PowerShell blocks `npm.ps1`
- Chain commands: `cd app; npm run qa`
- Save file may be locked while game runs — transient read errors are OK

## Optional (release path)

Before shipping an installer:

```powershell
cd app; npm run pack
```

Launch `release/win-unpacked/TBH Companion.exe` and repeat main-window smoke.
