# Agent doc routing

Read these files **before implementing** under `app/`. Open the file; do not rely on memory.

## Always (any `app/` feature, bugfix, or refactor)

1. [CODING-GUIDELINES.md](CODING-GUIDELINES.md)
2. [QA.md](QA.md) — completion gate (`pnpm qa` incl. lint/format, dev smoke)

## By path

| If you touch… | Also read |
|---------------|-----------|
| `app/src/renderer/**` | [layers/RENDERER.md](layers/RENDERER.md), [layers/UX.md](layers/UX.md), [layers/DESIGN-SYSTEM.md](layers/DESIGN-SYSTEM.md), `docs/STYLING.md` |
| `app/src/main/**`, `app/src/preload/**`, CSP, IPC, network, config | [layers/MAIN.md](layers/MAIN.md) |
| `app/src/core/**` | [layers/CORE.md](layers/CORE.md) |
| `data/*.json`, catalog loaders | [layers/DATA.md](layers/DATA.md) + run `pnpm run sync:agent-docs` if filenames/loaders changed |
| `CHANGELOG.md`, release, semver | [CHANGELOG-RELEASE.md](CHANGELOG-RELEASE.md) |

## Deep reference (read when needed)

| Doc | When |
|-----|------|
| [layers/RENDERER-PERFORMANCE.md](layers/RENDERER-PERFORMANCE.md) | Renderer hot-path refactor or list perf |
| [layers/UX-PATTERNS.md](layers/UX-PATTERNS.md) | New tab from scratch or large layout refactor |
| [QA-CHECKLIST.md](QA-CHECKLIST.md) | Debugging QA failures |
| [WINDOWS.md](WINDOWS.md) | Shell, encoding, path, or Electron install issues |
| [MAINTENANCE.md](MAINTENANCE.md) | Changing bundled data, IPC, or docs that reference repo paths |

## Workflow skills (not docs)

| Trigger | Skill |
|---------|-------|
| `/review-pr <N>` | `.cursor/skills/tbh-reviewer/SKILL.md` |
| Feature screenshots + announcement | `.cursor/skills/tbh-feature-showcase/SKILL.md` |
| Spec / plan / implement workflows | `.cursor/skills/tlc-spec-driven/SKILL.md` |

## Rules

- Apply docs during the work, not only at the end. No drive-by refactors outside the task.
- **Layer rules** (with docs above): `AGENTS.md` architecture table + `docs/ARCHITECTURE.md`.
- **Refactors:** follow [CODING-GUIDELINES.md](CODING-GUIDELINES.md) and layer docs; keep diffs surgical.
- **Done means:** [QA.md](QA.md) passed, spike/probe scripts removed when applicable, required docs followed, and [MAINTENANCE.md](MAINTENANCE.md) triggers satisfied (e.g. `sync:agent-docs` when bundled data changed) — not just green tests.

## After editing workflow skills

Edit `.cursor/skills/`; run `pnpm sync:skills` and commit `.claude/skills/` too.
