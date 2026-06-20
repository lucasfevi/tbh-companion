---
name: tbh-qa
description: Run TBH Companion QA before marking app work complete — lint, format, typecheck, tests, build, bundle path checks, and dev smoke so the Electron window is not blank. Use when finishing features, refactors, bugfixes, IPC/main/preload/renderer changes in app/, or before commits touching the companion app. Not for docs-only, data-only, or read-only questions outside app/.
license: CC-BY-4.0
metadata:
  author: tbh-project
  version: 1.2.0
---

# TBH Companion — QA gate

**A change is not done until QA passes.** Do not tell the user work is complete after only `pnpm test` or `pnpm run build`. The app must actually run when the change touches the UI or main process.

Blank window → read [references/checklist.md](references/checklist.md) § *Known failure modes* immediately.

## When to run

Run before every commit that touches `app/` (especially `main/`, `preload/`, `renderer/`, `shared/ipc.ts`, or window/path code).

**Also run Step 1 before every push or PR** — even when the diff is only `docs/`, `data/*.json`, or repo metadata. CI runs the same gate; bundled catalog changes can break tests (e.g. incompatible `stage_boxes.json` shape).

**Skip dev smoke (Steps 2–3)** only when the change is docs/metadata with no bundled JSON and no `app/` edits. Bundled `data/` updates still need Step 1; add Step 4 checks for new files in `REQUIRED_BUNDLED_DATA_FILES`.

## Dev smoke required?

| Change scope | Minimum QA |
|--------------|------------|
| `main/`, `preload/`, `renderer/`, `shared/ipc.ts`, windows, paths | Step 1 + Step 2 + Step 3 (or Step 2b fallback) |
| `core/` only (pure logic, no IPC/UI) | Step 1 (`pnpm run qa`) only |
| `core/` + behavior visible in UI | Full dev smoke |

## Workflow (in order)

```
QA progress:
- [ ] Step 1: Automated gate (`pnpm run qa`)
- [ ] Step 2: Dev launch (`pnpm run dev` or `pnpm run qa:dev`)
- [ ] Step 3: UI smoke OR automated dev fallback
- [ ] Step 4: Scope-specific checks (if applicable)
- [ ] Step 4b: Spike/probe cleanup (if applicable)
- [ ] Step 5: Report results to user
```

### Step 1 — Automated gate

From `app/`:

```powershell
cd app; pnpm run qa
```

Runs `typecheck`, `lint`, `format:check`, `vitest`, `build`, and bundle path guards (rejects `../../preload` in `out/main/index.js`). Fix lint/format issues with `pnpm run lint:fix` and `pnpm run format`, then re-run until green.

### Step 2 — Dev launch

**Option A — manual (preferred when you can see the UI):**

```powershell
cd app; pnpm run dev
```

Wait for `starting electron app...` and the Vite URL (usually `http://localhost:5173/`). Watch for main-process errors.

**Option B — automated fallback (agent cannot see the window):**

```powershell
cd app; pnpm run qa:dev
```

Starts dev briefly, checks the log for build errors, and verifies Vite serves HTML. Does **not** replace visual tab smoke when you changed renderer UX — say that in the report.

### Step 3 — UI smoke

Confirm the **main window is not blank**:

| Check | Pass criteria |
|-------|----------------|
| Window opens | Dark background (`#0f1117`), not empty white |
| Tab bar | Live / Inventory / Market / Settings visible |
| Save bar | "Connecting…" or "Save written …" |
| Live tab | Stats area renders (even without save file) |
| DevTools console | No red errors on load (Ctrl+Shift+I) |

**If using Step 2b only:** pass when `qa:dev` exits 0; note in report that visual tab checks were not performed.

Quit dev when done (close Electron + stop terminal).

### Step 4 — Scope-specific checks

| If you changed… | Also verify… |
|-----------------|--------------|
| `shared/ipc.ts`, preload, `main/ipc/` | IPC tests; invoke/send parity |
| `main/ipc/configPatch.ts`, Settings | currency → price refresh; CSV toggle |
| `main/paths.ts`, `main/windows/` | bundle check + dev not blank |
| `renderer/` only | dev smoke + no console errors |
| research spike / new `data/` or save parsing | remove `probe-*`, `spike-*`, scratch dumps; findings in tests, `data/`, or `docs/findings/` |
| new bundled JSON under `data/` | registration and loading conventions — see **tbh-data** |

Full checklist: [references/checklist.md](references/checklist.md) — read when debugging failures or testing Settings/Inventory/overlay.

### Step 4b — Spike / probe cleanup

When the task involved exploring save formats, APIs, or catalog shapes:

1. **Delete** temporary scripts under `app/scripts/` (e.g. `probe-*.ts`, `spike-*.ts`) and scratch outputs not wired into `package.json` or CI.
2. **Keep** durable results in `app/src/core/`, tests, `data/`, or `docs/findings/` — not in throwaway runners.
3. **Do not** leave spike scripts in the PR at merge time unless the user explicitly asked to keep them as a documented dev tool.

Rule: `.cursor/rules/spike-scripts.mdc`

### Step 5 — Report

Tell the user only after required steps pass:

```markdown
## QA
- `pnpm run qa`: pass (typecheck, lint, format, N tests, build, bundle paths)
- Dev: pass — [manual: tabs visible | automated: qa:dev exit 0]
- Manual: [extra checks]
```

If dev could not be visually confirmed, say so explicitly — **do not claim the app works**.

## Examples

### Example 1: Main process path change

User: "Extract window code; commit when done."

Actions:
1. `cd app; pnpm run qa`
2. `cd app; pnpm run dev` — confirm tab bar visible, not blank
3. Report with both results

### Example 2: Core-only tracker fix

User: "Fix rolling average math in `core/tracker.ts`."

Actions:
1. `cd app; pnpm run qa` (includes unit tests for tracker)
2. Skip dev smoke — no main/preload/renderer/IPC changes
3. Report: qa pass; dev smoke skipped (core-only)

## Hard rules

1. **Never skip dev smoke** for main/preload/window/path/IPC/renderer changes.
2. **Never mark done, push, or open a PR** with lint or format failures — `pnpm run qa` must pass (includes `lint` + `format:check`).
3. **Never open a PR without running Step 1 locally** and noting the result in the test plan.
4. **Paths**: preload/renderer via `app/src/main/paths.ts` (`../preload`, `../renderer` from `out/main/`).
5. **PowerShell**: chain with `;` not `&&`.
6. **PR bodies on Windows**: use `gh pr create --body-file` — never inline `--body "..."`.
7. **No personal data** in commits — see `docs/AGENT_WORKFLOW.md`.

## Reference

- Project conventions: `AGENTS.md`
- Detailed smoke + failure modes: [references/checklist.md](references/checklist.md)
- Architecture: `docs/ARCHITECTURE.md`
