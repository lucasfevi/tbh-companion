# CLAUDE.md — TBH Companion

Brief for Claude Code (and other agents). Same project as `AGENTS.md`; skills are mirrored under `.claude/skills/` from `.cursor/skills/`.

## What this is

Read-only companion for **TBH: Task Bar Hero** — Electron + React + TypeScript under `app/`. Reads encrypted local saves; never writes game files or talks to game servers.

## Build / QA

```powershell
cd app
npm install
npm run qa          # typecheck, lint, format, test, build — run before marking app work done
npm run dev         # visual smoke when UI/main changed
npm run qa:dev      # automated dev smoke when UI not visible
```

Windows + PowerShell: chain with `;` not `&&`; see `AGENTS.md` for encoding, paths, and save-file locking quirks.

## Project skills (required)

**Canonical edits:** `.cursor/skills/<name>/` → run `npm run sync:skills` from repo root → commit `.claude/skills/` too.

| Skill | Claude path | When |
|-------|-------------|------|
| **coding-guidelines** | `.claude/skills/coding-guidelines/SKILL.md` | Every feature, bugfix, refactor |
| **tbh-qa** | `.claude/skills/tbh-qa/SKILL.md` | Before marking any `app/` work done |
| **tbh-main** | `.claude/skills/tbh-main/SKILL.md` | `main/`, `preload/`, IPC, CSP, network |
| **tbh-renderer** | `.claude/skills/tbh-renderer/SKILL.md` | `renderer/` React performance |
| **tbh-ux** | `.claude/skills/tbh-ux/SKILL.md` | Tab chrome, overlays, layout |
| **tbh-changelog** | `.claude/skills/tbh-changelog/SKILL.md` | CHANGELOG, semver, releases |
| **tbh-reviewer** | `.claude/skills/tbh-reviewer/SKILL.md` | `/review-pr <N>` advisory PR review |

Read the relevant `SKILL.md` before implementing — do not rely on memory.

## PR review — `/review-pr <N>`

When the user says `/review-pr 39` or `review PR #39`:

1. Read `.claude/skills/tbh-reviewer/SKILL.md` and follow it exactly.
2. Preserve local WIP (stash or commit per skill), checkout the PR branch, diff vs base, post **advisory** review.
3. Restore the user's branch and stash when done.

CI on GitHub is the hard merge gate; review is advisory.

## Architecture (short)

| Layer | Path | Rules |
|-------|------|--------|
| **shared** | `app/shared/` | Types + `ipc.ts` only |
| **core** | `app/src/core/` | Pure logic — no electron, node:fs, fetch, React |
| **main** | `app/src/main/` | File I/O, network, IPC |
| **preload** | `app/src/preload/` | Thin `contextBridge` |
| **renderer** | `app/src/renderer/` | React via `window.tbh` / `TbhProvider` |

New IPC → `shared/ipc.ts` + `registerIpc` + preload + `test/ipc/channels.test.ts`.

## Git safety

- **Do not commit** unless the user asks.
- **Do not push** or open PRs without explicit approval (`docs/AGENT_WORKFLOW.md`).
- Never commit `*.es3`, decrypted dumps, or personal `sample/` saves.

## Docs

- `docs/ARCHITECTURE.md` — processes, windows, data flow
- `docs/STYLING.md` — renderer tokens and components
- `docs/DIAGNOSTIC_LOGGING.md` — main-only logging
- `docs/AGENT_WORKFLOW.md` — commits, push, PRs
- `AGENTS.md` — full project brief (Cursor + shared)
