---
name: tbh-reviewer
description: Advisory pull request review for TBH Companion — architecture, security boundaries, layer docs, and contributor checklist. Use when the user says /review-pr, review PR #N, review this pull request, or triage a contributor PR before merge. Checks out the PR branch after preserving local WIP. Outputs a structured advisory report (not a merge block). Not for local uncommitted-only review (use docs/agent/CODING-GUIDELINES.md), release changelog (docs/agent/CHANGELOG-RELEASE.md), or re-running full QA when CI is already green unless scope is suspicious.
license: CC-BY-4.0
metadata:
  author: tbh-project
  version: 1.0.0
---

# TBH Companion — PR reviewer

**Advisory only.** CI (`pnpm qa` on GitHub Actions) is the hard gate. This skill produces a maintainer-facing review comment; it does not approve, merge, or push.

## Trigger

- `/review-pr 39`
- `review PR #39`
- `review this pull request`

Parse PR number from the message. If missing, ask once.

## Workflow

```
Progress:
- [ ] Step 0: Record git state (branch, stash plan)
- [ ] Step 1: Handle local uncommitted changes
- [ ] Step 2: Fetch PR metadata and checkout PR branch
- [ ] Step 3: Gather diff vs base (usually main)
- [ ] Step 4: Map layers → load docs
- [ ] Step 5: Run review checklist
- [ ] Step 6: Post advisory review (template below)
- [ ] Step 7: Restore original branch / WIP
```

PowerShell: chain git/gh commands with `;` not `&&`. Quote paths with spaces.

### Step 0 — Record git state

```powershell
git branch --show-current
git status --porcelain
git stash list
```

Save **ORIG_BRANCH** and whether the working tree was dirty.

### Step 1 — Local uncommitted changes

If `git status --porcelain` is empty, skip to Step 2.

If dirty, choose **one** path (explain in the review preamble what you did):

| Situation | Action |
|-----------|--------|
| WIP unrelated to the PR (different task, docs scratch, debug) | `git stash push -u -m "tbh-reviewer:pre-pr-<N>"` |
| WIP on the **same branch** as the PR and clearly part of that PR | Commit on current branch **only if** user rules allow commits and message is obvious; else stash |
| WIP on another branch but should ship with this PR | `git stash push -u -m "tbh-reviewer:pre-pr-<N>"` then after checkout pop stash on PR branch |
| Unsure | Stash (safest) — mention in report that author may `git stash pop` |

Do **not** discard changes. Do **not** force checkout.

If checkout would fail, stop and report the blocker.

### Step 2 — PR metadata and checkout

```powershell
gh pr view <N> --json number,title,body,url,headRefName,baseRefName,state,author
gh pr checkout <N>
```

If `gh` is unavailable, `git fetch origin pull/<N>/head:review-pr-<N>` then `git checkout review-pr-<N>`.

Confirm PR targets `main` (or note if base differs). Read PR description and linked issues.

### Step 3 — Diff scope

```powershell
git fetch origin
git diff origin/<baseRefName>...HEAD --stat
git diff origin/<baseRefName>...HEAD --name-only
```

Note CI status from `gh pr checks <N>` if available — do not re-run `pnpm qa` locally unless CI failed, diff touches CI/workflow, or user asked.

### Step 4 — Load layer docs (read files, not memory)

Always read `docs/agent/CODING-GUIDELINES.md`.

By changed paths (see `docs/agent/SKILLS.md`):

| Paths | Also read |
|-------|-----------|
| `app/src/renderer/**` | `docs/agent/layers/RENDERER.md`, `docs/agent/layers/UX.md`, `docs/STYLING.md` |
| `app/src/main/**`, `preload/**`, `shared/ipc.ts` | `docs/agent/layers/MAIN.md` |
| `app/src/core/**` | `docs/agent/layers/CORE.md` |
| `data/*.json`, `core/bundledData.ts` | `docs/agent/layers/DATA.md` |
| `CHANGELOG.md`, release | `docs/agent/CHANGELOG-RELEASE.md` |
| `app/**` broadly | `docs/agent/QA.md` expectations (author should have run qa) |

### Step 5 — Review checklist

**Architecture & security (blockers in advisory sense — flag for maintainer)**

- [ ] `core/` purity respected — see `docs/agent/layers/CORE.md` § Hard rule: stay pure
- [ ] Save file remains read-only — no write paths to game saves
- [ ] New/changed IPC → `shared/ipc.ts`, preload, `registerIpc`, `test/ipc/channels.test.ts`
- [ ] No personal save data in the diff — see `docs/agent/GIT.md`
- [ ] Spike/probe scripts (`probe-*`, `spike-*`) not left in `app/scripts/` unless intentional
- [ ] New `data/*.json` registered correctly — see `docs/agent/layers/DATA.md` § Adding or changing a catalog file

**Tests & QA**

- [ ] `core/` behavior changes have Vitest coverage — see `docs/agent/layers/CORE.md` § Testing
- [ ] IPC/config changes have `test/main/` or `test/ipc/` updates
- [ ] UI/main/preload changes: PR or author should note dev smoke (tabs not blank)

**UX (if renderer)**

- [ ] Matches `docs/agent/layers/UX.md` § Review checklist (tab bar navigation, theme tokens, overlay entry points)

**Docs**

- [ ] User-visible behavior → consider `CHANGELOG.md` `[Unreleased]` (remind author; do not edit without approval)

Optional on Cursor: user may run Bugbot/security-review separately — not required for this skill.

### Step 6 — Advisory review output

Post this in chat (and optionally as a GitHub PR comment if user approves `gh pr comment`):

```markdown
## TBH PR Review (advisory) — PR #<N>

**Title:** …
**URL:** …
**CI:** pass | fail | unknown
**Local prep:** stashed | committed | clean | …

### Blockers
- … (architecture, security, missing tests for risky changes)

### Should fix
- …

### Nits
- …

### Checks passed
- …

### Docs referenced
- docs/agent/CODING-GUIDELINES.md, docs/agent/layers/MAIN.md, …
```

Severity guide:

- **Blocker:** would break read-only guarantee, leak Node into renderer, missing IPC tests on new channels, personal save data in repo
- **Should fix:** missing core tests, UX drift, changelog omission for user-visible work
- **Nit:** naming, copy, optional refactors

Do not claim "LGTM" or merge approval unless the user explicitly asks for a formal approval tone.

### Step 7 — Restore workspace

```powershell
git checkout <ORIG_BRANCH>
git stash list
```

If you stashed in Step 1: `git stash pop` when back on the branch where the user was working (or ask if pop would conflict).

Leave checkout on PR branch **only** if the user says to keep reviewing there.

## Examples

### Example: `/review-pr 39` with dirty unrelated WIP

1. On `feat/other`, uncommitted `docs/scratch.md` → stash `tbh-reviewer:pre-pr-39`
2. `gh pr checkout 39` → diff vs `main`
3. Flag missing IPC test if PR adds a channel
4. Post advisory review
5. `git checkout feat/other` → `git stash pop`

### Example: CI green, docs-only PR

1. Clean tree → checkout PR branch
2. Diff only `docs/**` → skip local QA re-run
3. Short review: checks passed, no app impact

## Hard rules

1. Never push, merge, or close the PR unless the user explicitly requests it.
2. Never discard local changes — stash or commit per Step 1.
3. Never commit personal save data while switching branches.
4. State clearly when visual dev smoke was not run.

## Related

- Contributor checklist: `.github/pull_request_template.md`
- Architecture: `docs/ARCHITECTURE.md`
- Agent harness: `docs/agent/README.md`
