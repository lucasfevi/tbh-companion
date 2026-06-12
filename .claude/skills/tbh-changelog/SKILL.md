---
name: tbh-changelog
description: Update TBH Companion CHANGELOG.md with user-facing release notes and recommend the next semver version (MAJOR.MINOR.PATCH per semver.org). Use when shipping a release, preparing Release prepare, adding unreleased notes after a feature merge, deciding 1.1.1 vs 1.2.0, or when the user asks to update the changelog or bump version. Always compare the latest release tag to main, confirm proposed changelog text before editing CHANGELOG.md, commit changelog work on main only, and confirm before push. Not for raw git commit lists in GitHub releases (see write-release-notes.sh), app code changes without release notes, or library API semver for npm consumers.
license: CC-BY-4.0
metadata:
  author: tbh-project
  version: 1.1.0
---

# TBH Companion — Changelog & semver

Keep `CHANGELOG.md` as the **user-facing** source of truth. Release automation (`.github/scripts/write-release-notes.sh`) copies the matching `## [VERSION]` section into GitHub Releases and appends a compare link. **Release prepare** fails if that section is missing.

Read [references/semver-guide.md](references/semver-guide.md) when classifying changes or the bump is ambiguous.

## Hard rules (never skip)

1. **Compare latest release → main.** Every run starts by diffing the latest shipped tag against `main` (not the current feature branch). User-facing bullets must reflect what landed on `main` since that tag.
2. **Confirm text before editing.** Present the full proposed `[Unreleased]` or promoted section in chat. Edit `CHANGELOG.md` only after the user approves the wording.
3. **Commit on `main` only.** Changelog updates and release-promotion commits belong on `main`. Switch to `main`, sync with origin, then commit. Do not leave changelog-only commits on feature branches.
4. **Confirm before push.** Summarize branch, commits, and scope; ask explicitly. Push only after the user says yes (see `docs/AGENT_WORKFLOW.md` and `.cursor/rules/git-remote-confirm.mdc`).

## When to run

| Trigger | Action |
|---------|--------|
| Feature/fix merged to `main` | Draft bullets for `[Unreleased]`, confirm, commit on `main` |
| User asks to release / tag / ship | Compare tag→main, draft promoted section, confirm, commit on `main`, hand off to Release prepare |
| PR merged with user-visible behavior | Update `[Unreleased]` on `main` after merge (confirm text first) |

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
- [ ] Step 0: On main and synced
- [ ] Step 1: Compare latest release tag → main
- [ ] Step 2: Draft changelog text (do not edit file yet)
- [ ] Step 3: User confirms text
- [ ] Step 4: Update CHANGELOG.md
- [ ] Step 5: Commit on main (if user asked for a commit)
- [ ] Step 6: Recommend semver; confirm before push
- [ ] Step 7: Report next steps
```

### Step 0 — On `main` and synced

From repo root (PowerShell — chain with `;`):

```powershell
git fetch origin
git checkout main
git pull origin main
```

If the user is mid-feature on another branch, finish or merge that work to `main` first. Changelog commits and release promotion always land on `main`.

### Step 1 — Compare latest release → `main`

Resolve the latest shipped tag and everything new on `main` since then:

```powershell
node .cursor/skills/tbh-changelog/scripts/version-hint.mjs
git log (git describe --tags --abbrev=0)..main --oneline --no-merges
git diff (git describe --tags --abbrev=0)..main --stat -- app/ CHANGELOG.md data/
```

Also read `CHANGELOG.md` `[Unreleased]`, merged PR descriptions, and any open PRs targeting `main`. Prefer **user impact** over commit titles.

`version-hint.mjs` compares `latestTag..main` (not `HEAD`) so results stay correct even if the agent started on a feature branch.

Current shipped version: `app/package.json` → `version` (must match latest git tag `v*` on main after a release).

**Present a short “since last release” summary** in chat: tag name, commit count, and the user-visible themes you infer before drafting bullets.

### Step 2 — Draft changelog text (no file edit)

- Merge duplicate topics; one bullet per distinct user-visible change.
- Use **bold** for UI labels, tab names, currencies, buttons.
- If a change replaces confusing behavior, say what users see now (not “fixed bug #…”).
- For release cuts, draft the full `## [X.Y.Z] - YYYY-MM-DD` section that will replace `[Unreleased]`.

Post the complete proposed markdown block in chat.

### Step 3 — User confirms text

Stop and wait for approval. If the user edits wording, redraft and ask again. **Do not write to `CHANGELOG.md` until they confirm.**

### Step 4 — Update `CHANGELOG.md`

Apply only the confirmed text. For release cuts: move content under `## [SUGGESTED_VERSION] - TODAY_ISO` and clear `[Unreleased]` (keep the heading).

Do **not** edit `app/package.json` locally unless asked — Release prepare bumps version and tags.

### Step 5 — Commit on `main`

Only when the user requests a commit (or their rules allow it):

```powershell
git status
git add CHANGELOG.md
git commit -m "docs: update changelog for ..."
```

Verify `git branch --show-current` is `main` before committing.

### Step 6 — Recommend semver; confirm before push

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
Suggested next: 1.1.1 — PATCH (bug fixes only since v1.1.0)
Compare: v1.1.0..main (N commits)
```

If pushing: summarize branch (`main`), commit message(s), and scope; ask “Want me to push `main` to origin?” Push only after yes.

After tag push, the **Release** workflow builds the installer and generates GitHub release body from the promoted section.

### Step 7 — Report to user

Include:

- “Since last release” summary (tag → main)
- Confirmed changelog edits applied
- Recommended version with semver rationale (one short paragraph)
- Next manual step: “Run **Release prepare** with `{version}` on GitHub Actions” (release cuts only)

## Examples

### Example 1: After merging a feature

User says: “We added PHP and UAH currencies — update the changelog.”

Actions:

1. `git checkout main; git pull origin main`
2. Compare `v1.1.0..main` — list commits and user-visible themes.
3. Post draft under `### Market` for confirmation.
4. On approval: edit `CHANGELOG.md`, commit on `main` if asked.
5. Recommend **MINOR** `1.2.0` if this is new capability; ask before push.

### Example 2: Preparing release

User says: “Ship the next release.”

Actions:

1. On `main`, run tag→main compare and `version-hint.mjs`.
2. Draft full `## [1.2.0] - 2026-06-11` section from `[Unreleased]` + anything missing from compare.
3. User confirms text → apply promotion, clear `[Unreleased]`.
4. Commit on `main` if asked; recommend version; ask before push.
5. Tell user to run Release prepare with `1.2.0`.

### Example 3: Agent started on a feature branch

User on `feat/pets-tab` asks to update changelog.

Actions:

1. Do **not** edit or commit on the feature branch.
2. Fetch, checkout `main`, pull.
3. Compare latest tag → `main` (includes merged and unmerged work only if it is on `main` — if the feature is not merged yet, tell the user to merge first or note it is not releasable from `main` yet).
4. Draft, confirm, then commit on `main`.

## Troubleshooting

### Release prepare failed: no CHANGELOG section

Add `## [X.Y.Z] - date` with the promoted bullets before running the workflow. `[Unreleased]` alone is not enough.

### package.json version ≠ latest tag

After a successful release they should match. If main has merged work past the tag, `[Unreleased]` holds not-yet-shipped notes; `package.json` still shows last release until Release prepare runs.

### Commits say `feat:` but change is internal only

Do not bump MINOR based on commit prefix alone. If users gain no new capability, treat as PATCH or omit from CHANGELOG.

### Not on `main`

Run Step 0 before any changelog edit or commit. Never push changelog work from a feature branch.

### User approved text but rejected push

Leave the local commit on `main`; do not push until they confirm.
