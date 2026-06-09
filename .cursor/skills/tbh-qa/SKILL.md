---
name: tbh-qa
description: >-
  Run TBH Companion QA before marking app work complete. Executes automated
  gates (typecheck, tests, build, bundle path checks) and dev smoke verification
  so the Electron window loads with a working UI. Use when finishing features,
  refactors, bugfixes, or IPC/main/renderer changes in app/, or before commits
  that touch the companion app.
---

# TBH Companion — QA gate

**A change is not done until QA passes.** Do not tell the user work is complete
after only `npm test` or `npm run build`. The app must actually run.

## When to run

Run this skill **before every commit** that touches `app/` (especially
`main/`, `preload/`, `renderer/`, `shared/ipc.ts`, or window/path code).

## Workflow (in order)

Copy and track:

```
QA progress:
- [ ] Step 1: Automated gate (`npm run qa`)
- [ ] Step 2: Dev launch (`npm run dev`)
- [ ] Step 3: UI smoke (window not blank)
- [ ] Step 4: Scope-specific checks (if applicable)
- [ ] Step 5: Report results to user
```

### Step 1 — Automated gate

From `app/`:

```powershell
cd app; npm run qa
```

This runs `typecheck`, `vitest`, `build`, and **bundle path guards** (catches
`../../preload` regressions that cause a blank window).

If it fails, fix and re-run until green.

### Step 2 — Dev launch

Start dev in the background; wait until the terminal shows
`starting electron app...` and the Vite URL (usually `http://localhost:5173/`).

```powershell
cd app; npm run dev
```

Watch for main-process errors in the terminal (missing modules, IPC throws).

### Step 3 — UI smoke (required)

Confirm the **main window is not blank**:

| Check | Pass criteria |
|-------|----------------|
| Window opens | Dark background (`#0f1117`), not empty white |
| Tab bar | Live / Inventory / Market / Settings visible |
| Save bar | "Connecting…" or "Save written …" (not a crash) |
| Live tab | Renders stats area (even if save missing) |
| DevTools console | No red errors on load (Ctrl+Shift+I) |

**Blank window = fail.** Usual cause: preload not loading → `window.tbh` undefined.
See [checklist.md](checklist.md) → *Known failure modes*.

Optional quick checks if you touched those areas:

- **Settings**: tab loads (not stuck on "Loading…")
- **Inventory**: table or "Waiting for save file…"
- **Mini overlay**: "Mini" button opens frameless overlay

Quit dev when done (close Electron + stop terminal).

### Step 4 — Scope-specific checks

| If you changed… | Also verify… |
|-----------------|--------------|
| `shared/ipc.ts`, preload, `main/ipc/` | `npm test` ipc tests; invoke/send parity |
| `main/ipc/configPatch.ts`, Settings | currency save refreshes prices; CSV toggle |
| `main/paths.ts`, `main/windows/` | `npm run qa` bundle check; dev not blank |
| `core/` only | tests sufficient; dev smoke still required for UI-facing changes |
| `renderer/` only | dev smoke + no console errors |

Full tab-by-tab list: [checklist.md](checklist.md).

### Step 5 — Report

Tell the user only after Steps 1–3 pass:

```markdown
## QA
- `npm run qa`: pass (typecheck, N tests, build, bundle paths)
- `npm run dev`: pass — main window loads, tabs visible, no console errors
- Manual: [anything extra you checked]
```

If dev could not be visually confirmed, say so explicitly and list what you
did instead — **do not claim the app works**.

## Hard rules

1. **Never skip dev smoke** for main/preload/window/path/IPC changes.
2. **Paths**: all preload/renderer paths go through `app/src/main/paths.ts`
   (`../preload`, `../renderer` from bundled `out/main/` — not `../../`).
3. **PowerShell**: chain with `;` not `&&`.
4. **No personal data** in commits (`.es3`, decrypted saves).

## Reference

- Project conventions: `AGENTS.md`
- Detailed smoke + failure modes: [checklist.md](checklist.md)
- Architecture: `docs/ARCHITECTURE.md`
