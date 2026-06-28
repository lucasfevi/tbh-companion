# Changelog and release

Keep `CHANGELOG.md` as the **long-form user-facing** source of truth. Release automation (`.github/scripts/write-release-notes.sh`) copies the matching `## [VERSION]` section into GitHub Releases and appends a compare link. **Release prepare** fails if that section is missing.

When preparing a release, also draft concise bundled **What's new** modal copy from the same user-facing analysis. Modal copy is a curated summary for the app, not a full duplicate of the changelog.

Read [references/semver-guide.md](references/semver-guide.md) when classifying changes or the bump is ambiguous.

## Hard rules (never skip)

1. **Compare latest release → main.** Every run starts by diffing the latest shipped tag against `main` (not the current feature branch). User-facing bullets must reflect what landed on `main` since that tag.
2. **Confirm text before editing.** Present the full proposed `[Unreleased]` or promoted section and any What's New modal copy in chat. Edit files only after the user approves the wording.
3. **Commit on `main` only.** Changelog updates and release-promotion commits belong on `main`. Switch to `main`, sync with origin, then commit. Do not leave changelog-only commits on feature branches.
4. **Confirm before push.** Summarize branch, commits, and scope; ask explicitly. Push only after the user says yes — see [PULL-REQUEST.md](PULL-REQUEST.md).

## When to run

| Trigger | Action |
|---------|--------|
| Feature/fix merged to `main` | Draft bullets for `[Unreleased]`, confirm, commit on `main` |
| User asks to release / tag / ship | Compare tag→main, draft promoted section + What's New copy, confirm, commit on `main`, hand off to Release prepare |
| PR merged with user-visible behavior | Update `[Unreleased]` on `main` after merge (confirm text first) |
| User asks for in-app What's New copy | Draft modal copy from the same tag→main analysis and keep it aligned with `CHANGELOG.md` |

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
- [ ] Step 2b: Draft What's New modal copy (release prep only)
- [ ] Step 3: User confirms changelog and What's New text
- [ ] Step 4: Update CHANGELOG.md and bundled What's New data when present
- [ ] Step 5: Commit on main (if user asked for a commit)
- [ ] Step 6: Recommend semver; confirm before push
- [ ] Step 7: Report next steps
- [ ] Step 8: Draft Discord announcement (after push)
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
node docs/agent/scripts/version-hint.mjs
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

### Step 2b — Draft What's New modal copy (release prep only)

When cutting a release or preparing bundled in-app release notes, draft modal copy alongside the changelog:

- Reuse the same user-facing themes as `CHANGELOG.md`.
- Keep it shorter: title plus **2-5 bullets** focused on features users should notice.
- Prefer player-facing labels and app surfaces: **About**, **Inventory**, **Mini**, **Settings**, etc.
- Include action suggestions when useful, e.g. a `Join Discord` action for an About Discord button.
- Do not include internal refactors, CI, tests, release automation, or raw commit subjects.

Post it in chat as a separate block after the changelog draft:

```markdown
What's New modal draft:
Title: What's new in vX.Y.Z
Bullets:
- ...
- ...
Actions:
- Join Discord -> https://...
```

If the app already has a bundled `whatsNew` data file, plan to update it after approval. If it does not exist yet, only draft the modal text in chat and note that the app feature must add the bundled source before it can be shipped.

### Step 3 — User confirms text

Stop and wait for approval. If the user edits wording, redraft and ask again. **Do not write to `CHANGELOG.md` or bundled What's New data until they confirm both.**

### Step 4 — Update `CHANGELOG.md` and bundled What's New data

Apply only the confirmed text. For release cuts: move content under `## [SUGGESTED_VERSION] - TODAY_ISO` and clear `[Unreleased]` (keep the heading).

If a bundled `whatsNew` data file exists, update it with the confirmed modal title, bullets, and actions for the same target version. Keep the app content concise and offline-safe. Do not create the app feature or data file during changelog-only work unless the user explicitly asks for implementation.

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
- Confirmed What's New modal copy applied, or the drafted copy if the app data file does not exist yet
- Recommended version with semver rationale (one short paragraph)
- Next manual step: “Run **Release prepare** with `{version}` on GitHub Actions” (release cuts only)

### Step 8 — Draft Discord announcement (after push)

Once changes are pushed to `main`, draft a Discord announcement based on the promoted changelog section. Post it in chat immediately after push without waiting for the user to ask.

**Format:**

```
**TBH Companion vX.Y.Z is out! 🎉**

One-sentence summary of the release theme.

**What's new:**

<one emoji + bold topic heading per group, matching the changelog ### headings>
- 2–3 concise bullets per group; collapse minor bullets into one if needed.

Close with a short line for fixes and data updates if present (no separate heading needed).
```

**Voice:** player-facing, enthusiastic but concise. Use the same topic labels as the changelog (`### Lookup`, `### Inventory`, etc.) mapped to readable headings. Don't repeat the version number in bullets. Keep the whole announcement under ~200 words.

**Do not post** to Discord — output the draft in chat for the user to copy.

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
3. Draft What's New modal copy from the same user-facing themes.
4. User confirms text → apply promotion, clear `[Unreleased]`, and update bundled What's New data if it exists.
5. Commit on `main` if asked; recommend version; ask before push.
6. Tell user to run Release prepare with `1.2.0`.

### Example 3: Agent started on a feature branch

User on `feat/pets-tab` asks to update changelog.

Actions:

1. Do **not** edit or commit on the feature branch.
2. Fetch, checkout `main`, pull.
3. Compare latest tag → `main` (if the feature is not merged yet, tell the user to merge first).
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
