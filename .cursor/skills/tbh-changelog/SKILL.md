---
name: tbh-changelog
description: Update TBH Companion CHANGELOG.md with user-facing release notes and recommend the next semver version (MAJOR.MINOR.PATCH per semver.org). Use when shipping a release, preparing Release prepare, adding unreleased notes after a feature merge, deciding 1.1.1 vs 1.2.0, or when the user asks to update the changelog or bump version. Not for raw git commit lists in GitHub releases (see write-release-notes.sh), app code changes without release notes, or library API semver for npm consumers.
license: CC-BY-4.0
metadata:
  author: tbh-project
  version: 1.0.0
---

# TBH Companion — Changelog & semver

Keep `CHANGELOG.md` as the **user-facing** source of truth. Release automation (`.github/scripts/write-release-notes.sh`) copies the matching `## [VERSION]` section into GitHub Releases and appends a compare link. **Release prepare** fails if that section is missing.

Read [references/semver-guide.md](references/semver-guide.md) when classifying changes or the bump is ambiguous.

## When to run

| Trigger | Action |
|---------|--------|
| Feature/fix merged to `main` | Add bullets under `## [Unreleased]` |
| User asks to release / tag / ship | Promote `[Unreleased]` → `## [X.Y.Z]`, recommend version, hand off to Release prepare |
| PR merged with user-visible behavior | Update `[Unreleased]` in same PR or immediately after merge |

**Skip** for docs-only spikes under `docs/findings/` with no app behavior change, unless the user explicitly wants a note.

## CHANGELOG rules

File: repo root `CHANGELOG.md`.

**Voice:** end-user topics, not commit subjects. Group with `### Topic` headings (Market, Mini overlay, Settings, …).

**Good bullet:** `Added **Philippine Peso (PHP)** and **Ukrainian Hryvnia (UAH)** as Steam Market currency options in Settings and the Market tab.`

**Bad bullet:** `feat: add PHP and UAH to STEAM_CURRENCIES`

**Do not log:** internal refactors, CI-only changes, test-only changes, chore(release), unless they fix something users noticed.

Structure:

```markdown
## [Unreleased]

### Topic
- User-facing bullet.

## [1.1.0] - 2026-06-10
...
```

- `[Unreleased]` stays at the top (below the intro paragraph).
- Dated releases use `## [MAJOR.MINOR.PATCH] - YYYY-MM-DD` (ISO date, no `v` prefix in the heading).
- Leave `[Unreleased]` empty (or a single “Nothing yet.” line) after promoting content to a version section.

## Workflow

```
Progress:
- [ ] Step 1: Gather changes since last release
- [ ] Step 2: Write or update [Unreleased] bullets
- [ ] Step 3: Recommend next semver
- [ ] Step 4: Promote section (only when cutting a release)
- [ ] Step 5: Report to user
```

### Step 1 — Gather changes

From repo root (PowerShell — chain with `;`):

```powershell
node .cursor/skills/tbh-changelog/scripts/version-hint.mjs
git log (git describe --tags --abbrev=0)..HEAD --oneline --no-merges
```

Read `CHANGELOG.md` `[Unreleased]` and any open PR description. Prefer **user impact** over commit titles.

Current shipped version: `app/package.json` → `version` (must match latest git tag `v*` on main after a release).

### Step 2 — Update `[Unreleased]`

- Merge duplicate topics; one bullet per distinct user-visible change.
- Use **bold** for UI labels, tab names, currencies, buttons.
- If a change replaces confusing behavior, say what users see now (not “fixed bug #…”).

### Step 3 — Recommend next semver

Follow [Semantic Versioning 2.0.0](https://semver.org/) with TBH’s public surface = **the desktop app experience** (tabs, overlay, settings, save read behavior, bundled data expectations) — see [references/semver-guide.md](references/semver-guide.md).

| Bump | When (TBH) |
|------|------------|
| **PATCH** `x.y.Z` | Bug fixes, copy/layout polish, performance, internal refactors — no new capability |
| **MINOR** `x.Y.0` | New backward-compatible capability (new currency, tab feature, tray behavior users can use) |
| **MAJOR** `X.0.0` | Breaking change: removed feature/tab, settings migration required, incompatible config or save-path contract |

**Decision order:** MAJOR if any breaking change → else MINOR if any new user-facing capability → else PATCH.

Use `version-hint.mjs` output as a **starting point**; override with judgment when commits are vague but CHANGELOG bullets are clear (or vice versa).

Report:

```
Current: 1.1.0 (tag v1.1.0)
Suggested next: 1.1.1 — PATCH (bug fixes only in [Unreleased])
Compare: v1.1.0..main
```

### Step 4 — Promote (release cut only)

When the user confirms a release:

1. Move all `[Unreleased]` content under `## [SUGGESTED_VERSION] - TODAY_ISO`.
2. Clear `[Unreleased]` (keep the heading).
3. Ensure `## [SUGGESTED_VERSION]` exists **before** running GitHub **Release prepare** with that version (workflow validates the heading).
4. Do **not** edit `app/package.json` locally unless asked — Release prepare bumps version and tags.

After tag push, the **Release** workflow builds the installer and generates GitHub release body from this section.

### Step 5 — Report to user

Include:

- Summary of `[Unreleased]` edits (if any)
- Recommended version with semver rationale (one short paragraph)
- Next manual step: “Run **Release prepare** with `{version}` on GitHub Actions” (or wait for merge if CHANGELOG is in a PR)

## Examples

### Example 1: After merging a feature

User says: “We added PHP and UAH currencies — update the changelog.”

Actions:

1. Add under `[Unreleased]` → `### Market` with currency bullet (if not already there).
2. Run `version-hint.mjs` → likely **MINOR** (`1.2.0`) if last tag is `1.1.0` and this is new capability; **PATCH** (`1.1.1`) if other pending `[Unreleased]` items are only fixes and you batch a patch release — state both options if ambiguous.
3. Do not promote to a version section until user asks to release.

### Example 2: Preparing release

User says: “Ship the next release.”

Actions:

1. Read `[Unreleased]` + git log since `v1.1.0`.
2. Recommend `1.1.1` (patch) vs `1.2.0` (minor) with rationale.
3. On confirmation: promote to `## [1.1.1] - 2026-06-10`, clear `[Unreleased]`.
4. Tell user to run Release prepare with `1.1.1`.

### Example 3: Fixes only since last tag

`[Unreleased]` contains only Live tab status copy fix and overlay button clarity.

→ Recommend **PATCH** `1.1.1`. No MAJOR/MINOR signals.

## Troubleshooting

### Release prepare failed: no CHANGELOG section

Add `## [X.Y.Z] - date` with the promoted bullets before running the workflow. `[Unreleased]` alone is not enough.

### package.json version ≠ latest tag

After a successful release they should match. If main has merged work past the tag, `[Unreleased]` holds not-yet-shipped notes; `package.json` still shows last release until Release prepare runs.

### Commits say `feat:` but change is internal only

Do not bump MINOR based on commit prefix alone. If users gain no new capability, treat as PATCH or omit from CHANGELOG.
