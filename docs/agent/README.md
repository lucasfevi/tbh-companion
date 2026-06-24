# Agent harness

Focused docs for AI agents and contributors. **One topic per file** — read only what your task needs.

## Map

| Doc | When to read |
|-----|----------------|
| [CODING-GUIDELINES.md](CODING-GUIDELINES.md) | Before any `app/` implementation, bugfix, or refactor |
| [QA.md](QA.md) | Before marking `app/` work done; Step 1 before every push/PR |
| [QA-CHECKLIST.md](QA-CHECKLIST.md) | Debugging QA failures or scope-specific smoke |
| [GIT.md](GIT.md) | Commits, branches, forbidden files |
| [PULL-REQUEST.md](PULL-REQUEST.md) | Push/PR confirmation, `gh pr create --body-file`, `/review-pr` |
| [WINDOWS.md](WINDOWS.md) | PowerShell, paths, encoding, Electron install quirks |
| [SKILLS.md](SKILLS.md) | Which layer doc to read by path (main, core, renderer, …) |
| [CHANGELOG-RELEASE.md](CHANGELOG-RELEASE.md) | `CHANGELOG.md`, semver, What's New modal copy |
| [MAINTENANCE.md](MAINTENANCE.md) | Keeping agent docs in sync with code (generated catalogs, link hygiene) |

## Layer docs (`layers/`)

| Doc | Paths |
|-----|--------|
| [layers/MAIN.md](layers/MAIN.md) | `app/src/main/`, `preload/`, `shared/ipc.ts` |
| [layers/CORE.md](layers/CORE.md) | `app/src/core/` |
| [layers/RENDERER.md](layers/RENDERER.md) | `app/src/renderer/` (performance, IPC) |
| [layers/RENDERER-PERFORMANCE.md](layers/RENDERER-PERFORMANCE.md) | Renderer hot-path refactors |
| [layers/UX.md](layers/UX.md) | Tab chrome, overlays, Chests, tray |
| [layers/UX-PATTERNS.md](layers/UX-PATTERNS.md) | New tab or large layout refactor |
| [layers/DESIGN-SYSTEM.md](layers/DESIGN-SYSTEM.md) | `design-system/primitives/` |
| [layers/DATA.md](layers/DATA.md) | Bundled `data/*.json` catalogs |

## Workflow skills (still under `.cursor/skills/`)

Multi-step tool workflows that stay as skills (mirrored to `.claude/skills/`):

| Skill | Trigger |
|-------|---------|
| **tbh-reviewer** | `/review-pr <N>`, "review PR #N" |
| **tbh-feature-showcase** | Screenshots + player announcement after a feature ships |
| **tlc-spec-driven** | Spec/plan/implement project workflows |

Edit skills in `.cursor/skills/`; run `pnpm sync:skills` from repo root and commit both trees.

## Domain docs (not agent-specific)

- `docs/ARCHITECTURE.md` — processes, IPC, windows, data flow
- `docs/STYLING.md` — tokens, layout stability
- `docs/DIAGNOSTIC_LOGGING.md` — main-process logging
- `docs/SAVE_FORMAT.md` — ES3 decryption + save JSON
- `docs/BENCHMARKS.md`, `docs/DECISIONS.md`, `docs/findings/`

## Entry points

- **Any agent:** `AGENTS.md` (project brief + link here)
- **Claude Code:** `CLAUDE.md` imports `AGENTS.md`

No Cursor rules — harness guidance lives entirely under `docs/agent/`.
