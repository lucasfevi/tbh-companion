# SemVer for TBH Companion

TBH Companion follows [Semantic Versioning 2.0.0](https://semver.org/). The **public API** is the shipped desktop app: what users see and configure, not internal modules or IPC types (no external npm consumers).

Version lives in `app/package.json`; git tags are `vMAJOR.MINOR.PATCH` (prefix `v` on the tag only, not in CHANGELOG headings).

## Bump rules

### MAJOR (`X.0.0`) — incompatible user-facing changes

Increment when users must adapt or lose access to something they relied on:

- Removed tab, setting, or export path
- Save file path default changed without automatic migration
- Settings schema change that drops or renames keys users set manually
- Renamed/removal of a user-visible feature they used in a prior release

Rare for this project once past 1.0.0. Prefer deprecation in a MINOR release before removal in the next MAJOR.

### MINOR (`x.Y.0`) — backward-compatible additions

Increment when users gain new capability without breaking existing workflows:

- New Steam Market currency in Settings/Market
- New tab section or overlay metric users can use
- New Settings toggle with sensible default (off or matching old behavior)
- System tray behavior that adds minimize-to-tray while quit still works
- New Chests/Inventory capability (filter, export, tracker)

Reset PATCH to `0` when MINOR increments.

### PATCH (`x.y.Z`) — fixes and polish

Increment when behavior is corrected or refined without new capability:

- Bug fixes (wrong rates, stale UI, crash on startup)
- Copy and layout tweaks (intro text, Mini overlay spacing)
- Performance or reliability (save read retries, price cache)
- Internal refactors, dependency bumps, CI/release scripts
- Documentation and bundled catalog updates that do not change app features

## Mapping conventional commits → bump hint

Use commit history as a **signal**, not the final answer. Always reconcile with `[Unreleased]` user bullets.

| Commit pattern | Typical bump | Caveat |
|----------------|--------------|--------|
| `feat:` / `feat(scope):` | MINOR | Ignore if user-invisible (refactor labeled feat) |
| `fix:` / `fix(scope):` | PATCH | |
| `feat!:` / `BREAKING CHANGE` | MAJOR | |
| `refactor:`, `chore:`, `docs:`, `test:`, `ci:` | PATCH or none | Often omit from CHANGELOG |
| `chore(release):` | none | Version bump commit, not a user change |

## Mixed `[Unreleased]` content

| Unreleased contains | Suggested bump |
|---------------------|----------------|
| Only fixes/polish | PATCH |
| At least one new user capability | MINOR |
| Any breaking change | MAJOR |
| New feature + fixes together | MINOR (fixes ship in the same minor) |

## Examples (1.1.0 → next)

| Changes | Version |
|---------|---------|
| PHP + UAH currencies only | **1.2.0** (MINOR) |
| PHP/UAH + overlay copy fix | **1.2.0** (MINOR) |
| Overlay copy fix only | **1.1.1** (PATCH) |
| Remove Market tab | **2.0.0** (MAJOR) |

## Pre-release

This repo uses stable `X.Y.Z` tags only today. If pre-release is needed later, use `-alpha.N` suffix per semver.org and document in CHANGELOG.
