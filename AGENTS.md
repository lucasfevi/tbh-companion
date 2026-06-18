# AGENTS.md - TBH Companion

Brief for any agent or contributor picking this up cold. Read `docs/` before
touching decryption or item mapping.

## What this is

A companion app for the idle game **TBH: Task Bar Hero**. It reads the game's
local, encrypted save file (read-only) and shows live stats: XP/hour, gold/hour,
per-hero rates, session history, and inventory valuation via the Steam
Market. It never modifies the save and never talks to the game servers.

## Where things are

- `app/` - the companion app (Electron + React + TypeScript). This is the
  target codebase.
  - `app/src/main/` - Electron main process (Node): file watching, decryption,
    tracking, IPC. Owns all file/network access.
  - `app/src/preload/` - `contextBridge` exposing a typed `window.tbh` API.
  - `app/src/core/` - framework-free, unit-tested logic (`es3`, `save/snapshot`,
    `tracker`, `stages`, `heroes`, `gamedata`, `inventory/*`, `steamPrice`).
  - `app/src/renderer/` - React UI (tabs + mini overlay). Pure UI, no Node APIs.
    Shared IPC state via `context/TbhProvider.tsx`.
  - `app/shared/types.ts` - types shared across processes.
- `data/` - bundled catalogs (`gamedata.json`, `stage_boxes.json`).
- `docs/` - the knowledge base (see below).

The original Python prototype (`tbh_xp/`) has been removed now that the TS core
reached parity; see `docs/DECISIONS.md` for the history.
- `config.json` - user settings, reused by the app.

## Build / run / test

The app lives under `app/` (created during the scaffold phase):

```
cd app
npm install
npm run dev        # electron-vite dev (main + renderer with HMR)
npm run build      # production bundle (out/)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint (errors fail; warnings OK)
npm run lint:fix   # eslint --fix
npm run format     # prettier --write
npm run format:check  # prettier --check
npm test           # vitest (core logic)
npm run bench      # performance benchmarks (see docs/BENCHMARKS.md)
npm run bench:ci   # benchmarks + JSON report for CI trend tracking
npm run qa         # typecheck + lint + format + test + build + bundle guards (run before marking done)
npm run qa:dev     # automated dev smoke when UI is not visible (see tbh-qa skill)
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

## Conventions

- TypeScript everywhere in `app/`. Keep `core/` free of Electron/React imports
  so it stays unit-testable.

## Project skills (required for features & refactors)

Skills live under **`.cursor/skills/`** (Cursor) and **`.claude/skills/`** (Claude Code — mirror). **Edit canonical files in `.cursor/skills/`**, then run `npm run sync:skills` from repo root and commit both trees.

**Read the relevant `SKILL.md` before coding** — enforced by `.cursor/rules/project-skills.mdc` (`alwaysApply: true`).

| Skill | Cursor | Claude | When |
|-------|--------|--------|------|
| **coding-guidelines** | `.cursor/skills/coding-guidelines/SKILL.md` | `.claude/skills/coding-guidelines/SKILL.md` | Every feature, bugfix, refactor |
| **tbh-qa** | `.cursor/skills/tbh-qa/SKILL.md` | `.claude/skills/tbh-qa/SKILL.md` | Before marking any `app/` work done |
| **tbh-main** | `.cursor/skills/tbh-main/SKILL.md` | `.claude/skills/tbh-main/SKILL.md` | Main, preload, IPC, CSP, network |
| **tbh-core** | `.cursor/skills/tbh-core/SKILL.md` | `.claude/skills/tbh-core/SKILL.md` | Pure logic, parsers, calculators in `core/` |
| **tbh-data** | `.cursor/skills/tbh-data/SKILL.md` | `.claude/skills/tbh-data/SKILL.md` | Bundled `data/*.json` catalogs |
| **tbh-renderer** | `.cursor/skills/tbh-renderer/SKILL.md` | `.claude/skills/tbh-renderer/SKILL.md` | Renderer React performance |
| **tbh-ux** | `.cursor/skills/tbh-ux/SKILL.md` | `.claude/skills/tbh-ux/SKILL.md` | Tab chrome, overlays, layout |
| **tbh-changelog** | `.cursor/skills/tbh-changelog/SKILL.md` | `.claude/skills/tbh-changelog/SKILL.md` | CHANGELOG, semver, releases |
| **tbh-reviewer** | `.cursor/skills/tbh-reviewer/SKILL.md` | `.claude/skills/tbh-reviewer/SKILL.md` | `/review-pr <N>` advisory PR review |

Do not skip skills for “small” diffs. Match skill to layer: renderer → **tbh-renderer** + **tbh-ux**; main/preload → **tbh-main**; core logic → **tbh-core**; bundled catalogs → **tbh-data**; release → **tbh-changelog**.

Deprecated (not synced): `best-practices`, `react-best-practices` — replaced by **tbh-main** and **tbh-renderer**.
- **Commits:** use Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`,
  `refactor:`). One focused commit per logical change; split large work into
  reviewable chunks. Commit when the user asks (or their rules allow); do not
  commit unless requested.
- **Push and PRs — confirm first:** never run `git push` or open a pull request
  without explicit user approval in the current conversation. Run `cd app; npm run qa`
  before push/PR; summarize branch, commits, scope, and QA; ask; then push or create
  the PR only after they confirm. On Windows PowerShell, use `gh pr create --body-file`
  for PR descriptions (never inline `--body`). See `docs/AGENT_WORKFLOW.md`.
- Never force-push unless the user explicitly requests it.
- Never commit personal save data (`*.es3`, decrypted dumps, `sample/`).

## Architecture & refactor conventions

Four layers — respect these when adding features (see `docs/ARCHITECTURE.md`):

| Layer | Path | Rules |
|-------|------|--------|
| **shared** | `app/shared/` | Types + `ipc.ts` channel names. No runtime logic. |
| **core** | `app/src/core/` | Pure domain logic. **No** `electron`, **no** `node:fs`, **no** `fetch`, **no** React. |
| **main** | `app/src/main/` | File I/O, network, windows, IPC. Orchestrates core via `app/appState.ts` and `ipc/`. |
| **preload** | `app/src/preload/` | Thin `contextBridge` only; import channels from `shared/ipc.ts`. |
| **renderer** | `app/src/renderer/` | React UI via `window.tbh`. Filter/sort in `renderer/lib/` or `core/` pure helpers. |

**Adding features:** read **coding-guidelines** + **tbh-qa** first; add **tbh-renderer** + **tbh-ux** or **tbh-main** when touching renderer or main/preload, **tbh-core** for pure logic/parsers, **tbh-data** for bundled `data/*.json` catalogs. New IPC → `shared/ipc.ts` + `main/ipc/registerIpc.ts` + preload + `test/ipc/channels.test.ts`. New save fields → parse in `core/`, read bytes in `main/` only. New main services → log lifecycle/errors per `docs/DIAGNOSTIC_LOGGING.md` (`createLogger` in main only; renderer uses `reportIpcError`).

**Refactor:** move without behavior change first; tests travel with code. No duplicate types (`AppConfig` lives in `shared/types.ts`). No new globals in `main/index.ts` — use `app/appState.ts` or services. Read **coding-guidelines** plus the layer skills above; keep diffs surgical (no drive-by rewrites).

**Testing:** all new `core/` logic needs Vitest; new IPC/config handlers need tests in `test/main/` or `test/ipc/`. Optional local integration: `test/integration/realSave.test.ts`.

**QA before done:** run the **tbh-qa** skill (`.cursor/skills/tbh-qa/SKILL.md`) — `npm run qa` (includes lint + format check), then `npm run dev` (non-blank window) or `npm run qa:dev` when the UI cannot be seen. Never mark app work complete on tests/build alone or with lint/format failures.

## Docs index

- `docs/AGENT_WORKFLOW.md` - git commits, push/PR confirmation, agent defaults.
- `docs/ARCHITECTURE.md` - processes, IPC boundary, windows, data flow.
- `docs/STYLING.md` - Tailwind + ui components vs legacy `styles.css` (renderer).
- `docs/DIAGNOSTIC_LOGGING.md` - how to add support logs (main/renderer rules, what to log).
- `docs/SAVE_FORMAT.md` - ES3 decryption scheme + save JSON layout.
- `docs/BENCHMARKS.md` - performance benchmarks (startup proxy, save parse, inventory, Steam cache).
- `docs/DECISIONS.md` - short ADR log of why the stack is what it is.
- `docs/findings/` - research outputs (Steam Market probe, item mapping).
