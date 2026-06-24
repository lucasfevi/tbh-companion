# AGENTS.md - TBH Companion

Brief for any agent or contributor picking this up cold. Read `docs/` before touching decryption or item mapping.

**Agent harness:** policies and layer guides live under [`docs/agent/`](docs/agent/README.md) — one topic per file. Start there for git, QA, PRs, and coding rules.

## What this is

A companion app for the idle game **TBH: Task Bar Hero**. It reads the game's local, encrypted save file (read-only) and shows live stats: XP/hour, gold/hour, per-hero rates, session history, and inventory valuation via the Steam Market. It never modifies the save and never talks to the game servers.

## Where things are

- `app/` - the companion app (Electron + React + TypeScript). This is the target codebase.
  - `app/src/main/` - Electron main process (Node): file watching, decryption, tracking, IPC. Owns all file/network access.
  - `app/src/preload/` - `contextBridge` exposing a typed `window.tbh` API.
  - `app/src/core/` - framework-free, unit-tested logic (`es3`, `save/snapshot`, `tracker`, `stages`, `heroes`, `gamedata`, `inventory/*`, `steamPrice`).
  - `app/src/renderer/` - React UI (tabs + mini overlay). Pure UI, no Node APIs. Shared IPC state via `context/TbhProvider.tsx`.
  - `app/shared/types.ts` - types shared across processes.
- `data/` - bundled catalogs (`gamedata.json`, `stage_boxes.json`).
- `docs/` - knowledge base (see below).
- `config.json` - user settings, reused by the app.

The original Python prototype (`tbh_xp/`) has been removed now that the TS core reached parity; see `docs/DECISIONS.md` for the history.

The app has two windows sharing one bundle: the full tabbed companion (`#main`) and a frameless always-on-top mini overlay (`#overlay`). Toggle from the "Mini" button in the tab bar; restore from the overlay's expand button.

## Build / run / test

This project uses **pnpm** (pinned via `packageManager`, activated through Corepack: `corepack enable`).

```
cd app
pnpm install
pnpm dev        # electron-vite dev (main + renderer with HMR)
pnpm build      # production bundle (out/)
pnpm typecheck
pnpm lint
pnpm lint:fix
pnpm format
pnpm format:check
pnpm test           # vitest (core logic)
pnpm bench      # see docs/BENCHMARKS.md
pnpm bench:ci
pnpm qa         # typecheck + lint + format + test + build + bundle guards
pnpm qa:dev     # automated dev smoke when UI is not visible — see docs/agent/QA.md
pnpm pack       # electron-builder --dir -> release/win-unpacked
pnpm dist       # Windows NSIS installer
```

**Windows quirks** (BOM, PowerShell, paths, Electron install): [`docs/agent/WINDOWS.md`](docs/agent/WINDOWS.md).

## Conventions

- TypeScript everywhere in `app/`. Keep `core/` free of Electron/React imports so it stays unit-testable.
- **Before `app/` work:** read [`docs/agent/SKILLS.md`](docs/agent/SKILLS.md) (routing) and [`docs/agent/CODING-GUIDELINES.md`](docs/agent/CODING-GUIDELINES.md).
- **Done means:** [`docs/agent/QA.md`](docs/agent/QA.md) passed — not just green tests.
- **Git / push / PR:** [`docs/agent/GIT.md`](docs/agent/GIT.md), [`docs/agent/PULL-REQUEST.md`](docs/agent/PULL-REQUEST.md).

## Architecture (four layers)

Respect these when adding features — full detail in `docs/ARCHITECTURE.md`:

| Layer | Path | Rules |
|-------|------|--------|
| **shared** | `app/shared/` | Types + `ipc.ts` channel names. No runtime logic. |
| **core** | `app/src/core/` | Pure domain logic. **No** `electron`, **no** `node:fs`, **no** `fetch`, **no** React. |
| **main** | `app/src/main/` | File I/O, network, windows, IPC. Orchestrates core via `app/appState.ts` and `ipc/`. |
| **preload** | `app/src/preload/` | Thin `contextBridge` only; import channels from `shared/ipc.ts`. |
| **renderer** | `app/src/renderer/` | React UI via `window.tbh`. Filter/sort in `renderer/lib/` or `core/` pure helpers. |

**Adding features:** layer docs under `docs/agent/layers/` — new IPC → `shared/ipc.ts` + `main/ipc/registerIpc.ts` + preload + `test/ipc/channels.test.ts`. New save fields → parse in `core/`, read bytes in `main/` only. New main services → log per `docs/DIAGNOSTIC_LOGGING.md`.

**Testing:** new `core/` logic needs Vitest; new IPC/config handlers need tests in `test/main/` or `test/ipc/`.

## Workflow skills (Cursor + Claude)

Multi-step workflows stay as skills in `.cursor/skills/` (mirrored to `.claude/skills/` via `pnpm sync:skills`):

| Skill | When |
|-------|------|
| **tbh-reviewer** | `/review-pr <N>` |
| **tbh-feature-showcase** | Screenshots + player announcement after a feature ships |
| **tlc-spec-driven** | Spec / plan / implement project workflows |

Edit canonical skills in `.cursor/skills/`; run `pnpm sync:skills` and commit both trees.

## Docs index

### Agent harness (`docs/agent/`)

- [`README.md`](docs/agent/README.md) — map of agent docs
- [`SKILLS.md`](docs/agent/SKILLS.md) — which doc to read by path
- [`CODING-GUIDELINES.md`](docs/agent/CODING-GUIDELINES.md) — implementation behavior
- [`QA.md`](docs/agent/QA.md), [`QA-CHECKLIST.md`](docs/agent/QA-CHECKLIST.md) — completion gate
- [`GIT.md`](docs/agent/GIT.md), [`PULL-REQUEST.md`](docs/agent/PULL-REQUEST.md) — commits, push, PRs
- [`WINDOWS.md`](docs/agent/WINDOWS.md) — PowerShell and environment
- [`CHANGELOG-RELEASE.md`](docs/agent/CHANGELOG-RELEASE.md) — release notes and semver
- [`MAINTENANCE.md`](docs/agent/MAINTENANCE.md) — keep agent docs in sync with code
- [`generated/`](docs/agent/generated/) — code-derived inventories (do not edit by hand)
- [`layers/`](docs/agent/layers/) — main, core, renderer, UX, design-system, data

### Domain

- `docs/ARCHITECTURE.md` - processes, IPC boundary, windows, data flow
- `docs/STYLING.md` - Tailwind + design-system vs legacy `styles.css`
- `docs/DIAGNOSTIC_LOGGING.md` - support logs (main/renderer rules)
- `docs/SAVE_FORMAT.md` - ES3 decryption + save JSON layout
- `docs/BENCHMARKS.md` - performance benchmarks
- `docs/DECISIONS.md` - ADR log
- `docs/findings/` - research outputs (Steam Market, item mapping)
