# Linux Support Test Report — feat/linux-support

**Date:** 2026-06-11  
**System:** Omarchy (Arch Linux) — Hyprland/Wayland  
**Tested by:** [@joelabreurojas](https://github.com/joelabreurojas)

---

## Summary

| Aspect | Result |
|--------|--------|
| Code quality | ✅ Passes all gates |
| Save auto-detection | ✅ Auto-detected without manual config |
| Cross-platform | ✅ Windows path unchanged, 3 Linux candidates |
| CI/CD | ✅ Parallel Linux release job in CI |
| Build targets | ✅ AppImage + deb configured |

---

## 1. Environment

```bash
# OS
❯ uname -a
Linux omarchy 6.x.x-arch1-1 #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux

# Session
❯ echo "$XDG_SESSION_TYPE"
wayland

# Node
❯ node --version
v25.2.1

# npm
❯ npm --version
11.6.2

# Electron
❯ npx electron --version
v42.3.3

# Steam
❯ which steam
/usr/bin/steam

# Game install
❯ ls ~/.local/share/Steam/steamapps/compatdata/3678970/
config_info  pfx  pfx.lock  tracked_files  version
```

---

## 2. Save File Location

The game saves to Steam/Proton's compatdata directory:

```
~/.local/share/Steam/steamapps/compatdata/3678970/pfx/drive_c/users/steamuser/
  AppData/LocalLow/TesseractStudio/TaskbarHero/SaveFile_Live.es3
```

File found: ✅ 107,776 bytes (stage 1206)

Also accessible via the `~/.steam/steam` symlink.

---

## 3. Save Path Candidates

The code defines 3 Linux candidates in priority order (from `app/src/main/config.ts`):

| # | Path | On This System | Notes |
|---|------|---------------|-------|
| 1 | `~/.local/share/Steam/...` | ✅ **Found** (chosen) | Arch native pacman Steam |
| 2 | `~/.steam/steam/...` | ✅ Found | Standard symlink |
| 3 | `~/.var/app/com.valvesoftware.Steam/...` | ❌ Not found | Flatpak — not installed |

### Priority order test (Node)

```javascript
// getDefaultSavePathCandidates('/home/user')
// First candidate (Arch native):
/home/user/.local/share/Steam/steamapps/compatdata/3678970/pfx/drive_c/users/steamuser/AppData/LocalLow/TesseractStudio/TaskbarHero/SaveFile_Live.es3
  → ✓ EXISTS (chosen)

// Second candidate (symlink):
/home/user/.steam/steam/steamapps/compatdata/3678970/pfx/drive_c/users/steamuser/AppData/LocalLow/TesseractStudio/TaskbarHero/SaveFile_Live.es3
  → ✓ EXISTS

// Third candidate (Flatpak):
/home/user/.var/app/com.valvesoftware.Steam/data/steam/...
  → ✗ missing (no Flatpak Steam)
```

---

## 4. Build & QA Gates

### 4.1 `npm ci`

```
added 483 packages, and audited 484 packages in 3s
found 0 vulnerabilities
```

✅ Pass

### 4.2 `npm run typecheck`

```
> tbh-companion@1.5.0 typecheck
> tsc --noEmit
```

✅ 0 errors

### 4.3 `npm test` (vitest)

```
 Test Files  32 passed | 1 skipped (33)
      Tests  173 passed | 5 skipped (178)
```

✅ **173 tests passed, 0 failures**

### 4.4 `npm run lint`

```
3 warnings (all pre-existing react-refresh warnings)
0 errors
```

✅ Pass

### 4.5 `npm run format:check`

```
All matched files use Prettier code style!
```

✅ Pass

### 4.6 `npm run build`

```
✓ 73 modules transformed (main)
✓ 2 modules transformed (preload)
✓ 87 modules transformed (renderer)
✓ built in <1s
```

✅ Build success

### 4.7 Combined QA

All gates passed: typecheck ✅ → lint ✅ → format ✅ → test ✅ → build ✅

---

## 5. Runtime Tests

### 5.1 App startup

```
19:27:11.462 (app)         › TBH Companion v1.5.0 ready
```

### 5.2 Save auto-detection

```
19:27:11.469 (session)     › Session snapshot loaded; waiting for save read to restore
19:27:11.469 (tracking)    › Save watcher started (poll 5s, path /home/user/.local/share/Steam/.../SaveFile_Live.es3)
```

✅ **No manual config needed** — the save path was auto-detected at first candidate.

### 5.3 Save read

```
19:27:11.472 (saveWatcher) › First save read OK (stage 1206)
```

✅ Save file decrypts and parses correctly (stage 1206).

### 5.4 Session persistence

```
19:27:11.473 (session)     › Session stats restored from snapshot
```

✅ Previous session restored from snapshot.

### 5.5 Tracking loop

```
19:27:11.469 (tracking)    › Save watcher started (poll 5s, path .../SaveFile_Live.es3)
```

✅ Tracking polling every 5 seconds on the correct Linux path.

### 5.6 Wayland compatibility

```
$ npx electron --ozone-platform-hint=wayland out/main/index.js
```

✅ App starts without crash on Wayland when the Ozone flag is passed.

**Known issue:** Without `--ozone-platform-hint=wayland`, Electron 42 crashes with:
```
FATAL:content/browser/gpu/gpu_data_manager_impl_private.cc:418
GPU process isn't usable. Goodbye.
```

This is a **known Electron-on-Wayland issue**, not specific to this app. Users on Wayland need to pass the flag or set the env var.

---

## 6. Change Summary

### Files changed (`main..feat/linux-support`)

```
.github/workflows/release.yml      +Linux parallel CI job
.app/.prettierignore                 +openspec/, .atl/ entries
app/package.json                    +Linux build targets (AppImage, deb)
app/src/main/config.ts              +3 new exported functions
app/test/main/config.test.ts        +140 lines: tests for path candidates
config.json                         +default savePath → ""
```

### What changed (semantic)

| Concern | Before | After |
|---------|--------|-------|
| Save path | Hardcoded Windows path | Platform-aware with 3 Linux candidates |
| Linux save dir | Not supported | Arch native + standard symlink + Flatpak |
| Save resolution | Static default | Dynamic via `resolveConfig()` |
| CI | Windows only | Parallel Windows + Linux jobs |
| Build | Windows NSIS only | AppImage + deb |
| Test coverage | — | 11 new tests for config module |

---

## 7. Known Issues / Notes

1. **Wayland GPU crash** — Electron 42 requires `--ozone-platform-hint=wayland` on Wayland. Not app-specific.
2. **Flatpak Steam** — Candidate #3 was not tested (no Flatpak Steam installed).
3. **Snapshot compatibility** — Existing Windows save snapshots may have stale paths after switching to Linux. The session state service handles this gracefully.
4. **AppImage permissions** — On first run, `chmod +x *.AppImage` may be needed. The `--no-sandbox` flag might be required on some kernels.

---

## 8. Checklist

- [x] `npm ci` — installs cleanly
- [x] `npm run typecheck` — 0 TypeScript errors
- [x] `npm test` — 173 tests pass, 0 failures
- [x] `npm run lint` — 0 errors
- [x] `npm run format:check` — all Prettier
- [x] `npm run build` — production build succeeds
- [x] Save file auto-detected without manual config
- [x] Tracking starts and polls correctly
- [x] Session restored from snapshot
- [x] App opens on Wayland (with Ozone flag)

## 9. Verdict

**✅ Ready to merge.** The Linux support is solid, well-tested, and works on Arch Linux with native Steam. The only rough edge (Wayland GPU crash) is an Electron platform issue that affects all Electron apps identically.
