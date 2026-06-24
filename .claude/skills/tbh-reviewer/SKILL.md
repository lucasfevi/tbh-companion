---
name: tbh-reviewer
description: Multi-agent PR reviewer for TBH Companion. Use ONLY when explicitly asked to review a pull request: "review PR #N", "review this PR", "code review", "check this pull request", "/review-pr N". Coordinates 6 specialized subagents then consolidates findings into a unified GitHub PR comment. Do NOT trigger automatically during coding, feature implementation, or general questions.
license: CC-BY-4.0
metadata:
  author: tbh-project
  version: 2.0.0
---

# TBH Companion — PR Review Orchestration Protocol

Coordinates 6 specialized subagents (via the Task tool) then consolidates findings into a unified summary posted as a GitHub PR comment. Each subagent loads the relevant project docs — this skill does not duplicate them.

**Advisory only.** CI (`pnpm qa` on GitHub Actions) is the hard gate. This skill produces a maintainer-facing review comment; it does not approve, merge, or push.

## Step 1: Initialize

Run all of these in parallel:

1. Get PR number from context or ask the user.
2. Identify repo: `gh repo view --json nameWithOwner -q .nameWithOwner`
3. Fetch diff: `gh pr diff {PR_NUMBER}`
4. Read PR metadata: `gh pr view {PR_NUMBER} --json title,body,headRefName,baseRefName,state,author,url`
5. Fetch existing review comments to avoid duplicates: `gh api repos/{REPO}/pulls/{PR_NUMBER}/comments`
6. Check CI status: `gh pr checks {PR_NUMBER}` (note result; do not re-run `pnpm qa` locally unless CI failed)

**Spec discovery** — run after fetching PR metadata:

1. Extract the feature slug from the branch name by stripping the type prefix: `feat/box-tracker-filters` → `box-tracker-filters`, `refactor/remove-catalog-cache` → `remove-catalog-cache`.
2. Look for `.specs/features/{slug}/spec.md`. Also check `.specs/features/{slug}/tasks.md` and `.specs/quick/*/TASK.md` if no feature spec exists.
3. If not found by branch slug, scan the PR title and body for explicit file paths (`.specs/`, `spec.md`, `tasks.md`) or markdown links pointing to spec files — read any referenced file.
4. If still not found, ask the user once: *"Does a spec file exist for this PR? If so, what is the path?"* If the user says no, proceed without spec compliance check and note it in the report.

Pass REPO, PR_NUMBER, the diff text, PR metadata, existing comment locations, CI status, and the spec file content (or `null`) to each subagent in Step 2.

---

## Severity Labels (all subagents use these)

- 🚨 Critical — bugs or logic errors that will cause failures
- 🔒 Security — security violations or data exposure
- ⚡ Performance — significant React/IPC/bundle-size concerns
- ⚠️ Warning — code smells or layer boundary drift
- 💡 Suggestion — optional improvements

---

## Universal Rules (every subagent must follow)

1. **False positive guard:** Only report findings with ≥80% confidence. Skip when uncertain.
2. **Positive highlight:** Include at least one well-done aspect of the change before listing issues.
3. **Tone:** Specific, actionable, collegial. Explain WHY something is a problem.
4. **Never** approve, merge, or modify files.
5. **Second pass required:** After completing analysis, re-read the full diff from top to bottom and list every file you did not comment on. For each uncovered file, explicitly state why it is clean or add a finding.
6. **Marker:** Start every finding with `<!-- tbh-review:{type} -->` (used by the consolidation subagent to parse results). Types: `security`, `spec`, `tests`, `architecture`, `regression`, `ux-sim`.

---

## Subagent 1: Security & Boundaries

**Marker:** `<!-- tbh-review:security -->`

### Documents to load first

- `docs/agent/layers/MAIN.md` (§ Hard rules, § Security, § CSP & network)
- `docs/agent/GIT.md` (§ Never commit personal save data)
- `docs/ARCHITECTURE.md` (IPC boundary and process model)

### What to check

**Save file integrity (highest priority)**
- The companion is read-only. Flag any code path that writes to `*.es3`, game save paths, or any path containing the game's user data directory.
- Flag any use of `fs.writeFile` / `fs.write` that could touch save files — even behind an impossible branch.

**Process boundary**
- No `electron`, `node:fs`, `ipcRenderer`, or `require('electron')` imported in `app/src/renderer/`.
- Renderer uses `window.tbh` only — no raw Node or IPC APIs.
- `core/` must not import `electron`, `node:fs`, `fetch`, or React. Exception: `bundledData.ts` with `fs.readFileSync` is the one sanctioned case.

**IPC & preload surface**
- Preload must not expose a generic `invoke(channel, ...)` escape hatch.
- New IPC channels must be declared in `shared/ipc.ts` — no ad-hoc string literals.

**CSP**
- The renderer CSP must not be widened for convenience (`script-src 'self'`, `connect-src` Steam hosts only).
- Steam Market fetches must run in main process only — never from renderer via `fetch`.

**Secrets & data hygiene**
- No hardcoded API keys, tokens, or credentials.
- No logging of full save JSON, player tokens, or other sensitive fields.
- No `*.es3`, decrypted save dumps, or personal player data in the diff.

**Second pass:** Re-read the full diff. For every file not yet assessed, explicitly state why it is clean from a security perspective.

**Finding format:**
```
<!-- tbh-review:security -->
🔒 Security — [Short title]
[What the issue is and why it matters in TBH context]
**Recommendation:** [Specific fix]
```

---

## Subagent 2: Spec Compliance

**Marker:** `<!-- tbh-review:spec -->`
**Posts:** One PR-level summary only — no per-finding format needed.

This subagent only runs if a spec file was provided. If `spec = null`, post:
> ⚠️ No spec file found for this PR — requirements verification skipped. If a spec exists, re-run with its path.

### When a spec is provided

Load `spec.md` and any `tasks.md` or `design.md` in the same feature directory. Extract every verifiable item:

- **Goals** — checklist items under `## Goals`
- **Acceptance criteria** — every `WHEN … THEN … SHALL` clause under each User Story
- **Success criteria** — checklist under `## Success Criteria`
- **Task completion** — if `tasks.md` exists, every checkbox under implementation tasks

For each extracted item:

1. Find the relevant section of the diff (or confirm its absence).
2. Mark it **✅ Implemented**, **❌ Missing or Incomplete**, or **🔲 Not verifiable from diff alone**.

**Second pass:** Re-read the full extracted item list one at a time. For any item not yet assessed, find the relevant diff section and mark it.

**Findings format (PR-level comment):**
```markdown
<!-- tbh-review:spec -->
## 📋 Spec Compliance

**Spec:** `.specs/features/{slug}/spec.md`

### ✅ Implemented
- [AC from spec]

### ❌ Missing or Incomplete
- [AC from spec] — [why it appears unimplemented in the diff]

### 🔲 Not verifiable from diff alone
- [AC from spec] — [what would need manual testing]

### 🔲 Definition of Done
- [x] Criterion covered — [ ] Not covered

### 💬 Notes
[Any observations about scope drift, out-of-scope items added, or items marked out-of-scope in spec but present in diff]
```

---

## Subagent 3: Test Coverage

**Marker:** `<!-- tbh-review:tests -->`

### Documents to load first

- `docs/agent/layers/CORE.md` (§ Testing)
- `docs/agent/layers/MAIN.md` (§ IPC checklist)
- `docs/agent/QA.md` (§ Dev smoke required)

### What to check

**Core logic tests (`test/core/`)**

For every new or changed function in `app/src/core/`:
- Is there a corresponding Vitest test in `test/core/`?
- Patterns to enforce (from CORE.md § Testing):
  - Load **real catalogs** via loader functions (`loadBoxTypeCatalog()`, etc.) — not hand-rolled fixture objects that can drift from actual data.
  - `toMatchObject` for partial shape checks; `toEqual` when the whole shape matters.
  - One `describe` per exported function, one `it` per behavior.
  - Edge cases covered: missing/zero-quantity entries, unknown catalog ids, malformed save fields.

**IPC channel tests (`test/ipc/channels.test.ts`)**

For every new or changed IPC channel in `shared/ipc.ts` or `main/ipc/`:
- Is `test/ipc/channels.test.ts` updated to include the new channel constant?
- Missing channel tests on new IPC are 🚨 Critical.

**Bundled data tests**

For every new file registered in `REQUIRED_BUNDLED_DATA_FILES` in `core/bundledData.ts`:
- Is `app/test/core/bundledData.test.ts` updated? The test loads every registered file in dev.

**Anti-patterns**
- Test mocks `fs` or `electron` → the logic under test probably belongs in `main/`, not `core/`. Flag as ⚠️ Warning.
- Hard-coded fixture catalog objects that duplicate `data/*.json` shapes → drift risk.
- No test at all for a new `core/` export → 🚨 Critical if the export is non-trivial.

**Second pass:** List every new or modified function in `core/`, IPC handler in `main/ipc/`, and new file in `REQUIRED_BUNDLED_DATA_FILES`. For each one not yet assessed, state whether coverage exists or is missing.

**Finding format:**
```
<!-- tbh-review:tests -->
[🚨/⚠️/💡] — [Short title]
[What behavior is untested and why it matters]
**Recommendation:** [Pattern to follow per CORE.md § Testing]
```

---

## Subagent 4: Architecture & Layer Rules

**Marker:** `<!-- tbh-review:architecture -->`

### Phase 0 — Load all reference documents

Load every document below before reading the diff. Do not skip any.

1. `docs/agent/layers/CORE.md`
2. `docs/agent/layers/MAIN.md`
3. `docs/agent/layers/RENDERER.md`
4. `docs/agent/layers/RENDERER-PERFORMANCE.md`
5. `docs/agent/layers/UX.md`
6. `docs/agent/layers/DATA.md`
7. `docs/agent/CODING-GUIDELINES.md`
8. `docs/agent/layers/DESIGN-SYSTEM.md` — only if the diff touches `renderer/design-system/` or `renderer/tabs/`

Then scan the changed file paths:
- Any path under `app/src/core/` → this is a **core layer change**
- Any path under `app/src/main/` or `app/src/preload/` or `app/shared/` → **main/preload layer change**
- Any path under `app/src/renderer/` → **renderer layer change**
- Any path under `data/` or referencing `bundledData.ts` → **data layer change**

Note which layers are touched — this narrows which doc sections are most relevant in Phase 2.

### Phase 1 — Extract the rule list

Do not use a hardcoded list. After loading all Phase 0 documents, extract every explicit rule into a single numbered checklist. Extraction targets:

- **`CORE.md`** — § Hard rule: stay pure (the explicit "must never import" list), § Module layout patterns
- **`MAIN.md`** — § Hard rules (numbered list 1–7), § IPC checklist (every checkbox item), § Security bullets
- **`RENDERER.md`** — § TBH-specific renderer rules (numbered list 1–7), § Priority categories
- **`RENDERER-PERFORMANCE.md`** — every explicit DO / DO NOT under each priority heading (CRITICAL, HIGH, MEDIUM, LOW)
- **`UX.md`** — § Review checklist (every checkbox), § Main window chrome rules, § Overlays rules
- **`DATA.md`** — § Adding or changing a catalog file (every numbered step as a rule), § Schema changes checklist
- **`CODING-GUIDELINES.md`** — § TypeScript style (TBH) (every bullet under each sub-rule)

Number the combined list sequentially from 1. This is your evaluation matrix for Phase 2.

### Phase 2 — Evaluate the matrix

Work through the diff one file at a time. For each changed file:

- For each rule in the Phase 1 list, decide: **PASS** / **VIOLATION** / **N/A**
- N/A is only valid when the rule is structurally inapplicable to the file type (e.g. a `data/*.json` file cannot violate renderer rules)
- For every VIOLATION: record the finding with the exact offending line quoted and the rule number + source doc

**Second pass:** After completing the matrix for all files, re-read the diff top to bottom. List every file you did not evaluate. Run the matrix on any uncovered file. Only skip a file when you can explicitly state which rules are N/A and why.

**Finding format:**
```
<!-- tbh-review:architecture -->
[🚨/⚠️/💡] — [Short title]
Rule: [Rule number + source doc section, e.g. "Rule 3 — MAIN.md § Hard rules"]
[What in the diff violates it — quote the offending line]
**Recommendation:** [Exact fix, short code sketch if < 6 lines]
```

---

## Subagent 5: Regression & Scope Drift

**Marker:** `<!-- tbh-review:regression -->`

### What to check

Review the diff for code changes unrelated to the PR's stated purpose, signs of AI-generated artifacts, or TBH-specific cleanup gaps:

**Scope drift / unrelated deletions**
- Code deleted that has no connection to the PR title or linked spec (🚨 Critical — could silently break features)
- Functions or exports removed without removing their callers

**AI hallucination artifacts**
- Phantom imports referencing non-existent symbols (🚨 Critical)
- Method calls with wrong signatures vs. their actual definition
- Type assertions (`as X`) hiding real TypeScript errors
- `// @ts-ignore` or `// @ts-expect-error` on new lines

**Quality regression**
- `TODO` or `FIXME` left in production code paths
- Weakened error handling: removed `try/catch`, silent `catch (_)` swallowing errors
- Weakened test assertions (e.g. removing `.toEqual` specificity, deleting edge-case tests)
- Dead code that is never called (new exports with no import, new handlers never registered)
- Duplicate logic that already exists in a nearby module

**TBH-specific cleanup gaps**
- `probe-*` or `spike-*` scripts left in `app/scripts/` (should be removed before merge — see `docs/agent/QA.md` § Step 4b)
- Personal save data (`*.es3`, decrypted save dumps, paths containing user home) anywhere in the diff
- Orphaned IPC channel: removed from `shared/ipc.ts` but still referenced in preload or `registerIpc.ts` (or vice versa)
- Orphaned bundled data: filename removed from `data/` but still in `REQUIRED_BUNDLED_DATA_FILES`, or added to `REQUIRED_BUNDLED_DATA_FILES` without a corresponding `data/` file

**Second pass:** Re-read the full diff. For every file not yet assessed, explicitly state why none of the above categories apply.

**Finding format:**
```
<!-- tbh-review:regression -->
[🚨/⚠️/💡] — [Short title]
Type: [scope-drift | hallucination | quality-regression | cleanup-gap | orphaned-ipc | orphaned-data]
[Specific description with quoted evidence from the diff]
**Recommendation:** [Exact fix]
```

---

## Subagent 6: Player Experience Simulation

**Marker:** `<!-- tbh-review:ux-sim -->`

**Scope guard:** If the diff contains no changes under `app/src/renderer/`, output:
> 🎮 No renderer changes in this PR — player experience simulation skipped.
and stop. Do not fabricate findings for non-UI PRs.

This subagent reads the renderer diff as if it were a player opening the app for the first time. It does **not** run the app. All findings are based on static analysis of component code, copy text, and conditional render logic. Every finding must note: *"Based on code analysis only — visual confirmation needed."*

### Documents to load first

- `docs/agent/layers/UX.md` (§ Copy tone, § Tab content pattern, § Overlays, § Review checklist)
- `docs/agent/layers/UX-PATTERNS.md` (for new tabs or large layout changes)
- `docs/STYLING.md` (§ Layout stability — relevant for conditional UI and empty states)

### What to simulate

**1. Discoverability — can a player find this without being told?**

- Is the feature reachable from the main window without prior knowledge? (tab bar, toolbar button, in-tab CTA, tray menu)
- If it's a new tab: does the tab label communicate what's inside to someone who has never seen it? Would a player click it?
- If it's a new button or action: is it visible in the default view, or buried in a secondary panel?
- If it requires a specific save state to appear: is there a fallback UI that explains the condition?

**2. First-encounter state — what does a brand-new player see?**

Walk through the component's render logic and identify every conditional branch. For each one that could fire on first launch:
- Is there a meaningful empty state (message explaining why there's nothing yet) or just blank space?
- Is there a loading state while the IPC call returns?
- If the save file hasn't been read yet, does the player see a spinner, a placeholder, or nothing?

Flag any branch that renders nothing with no explanation as ⚠️ Warning.

**3. Copy & tone**

Read every string literal, JSX text node, and template expression in the diff.

- No dev/internal language: `IPC`, `main process`, `renderer`, `electron`, `config.json`, file paths
- No generic error text: `"Error"`, `"Something went wrong"` without context
- Errors framed in terms of what the player should do next, not what went wrong internally
- Feature and item names match TBH game terminology (not code variable names)
- Copy tone is direct and player-friendly — see UX.md § Copy tone

**4. User paths — trace the happy path and the main failure modes**

Identify the primary user flow from the diff (e.g. "player opens Inventory → sees unknown item → reads banner"). Then identify the 2–3 most likely failure or edge-case paths:

| Path | Trigger (from code) | What player sees (from render logic) | Clear? |
|---|---|---|---|
| Happy path | data present | ... | ✅/⚠️/❌ |
| No save file | save state null/loading | ... | ✅/⚠️/❌ |
| Unknown items | `known: false` items | ... | ✅/⚠️/❌ |
| IPC error | error state | ... | ✅/⚠️/❌ |

For each ⚠️ or ❌ path: explain what a real player would likely think happened, and suggest a copy or state fix.

**5. Interaction affordances**

- Buttons: is the action obvious from the label alone, without reading surrounding context?
- Filters/sorts: does the default state make sense on first open?
- Toggles: is the current state (on/off) visually encoded, or only inferable from behavior?
- Links and secondary actions: are they visually distinguishable from body text?

**6. Cognitive load**

- Is the most important information visually prominent or buried?
- Walls of text that should be in `<details>` or a tooltip
- More than ~3 primary actions visible at once without clear hierarchy

### What this subagent cannot assess (always note these explicitly)

At the end of findings, include:
```
**Not assessable from code:**
- Visual appearance and actual rendered layout
- Hover/focus states and interaction feedback
- Animation timing and transitions
- Whether the layout fits within 1100×720 without scrolling
Use `verify` skill or manual dev smoke (docs/agent/QA.md) to confirm these.
```

**Finding format:**
```
<!-- tbh-review:ux-sim -->
[⚠️/💡] — [Short title from a player's perspective]
**Path:** [Which user path triggers this — e.g. "Player opens feature with no save file"]
[What the player would see or experience, based on the render logic]
**Why it's confusing:** [The mental model a player would form vs. what's actually happening]
**Recommendation:** [Copy change, empty state addition, or UX pattern fix]
*Based on code analysis only — visual confirmation needed.*
```

Note: 🚨 Critical and 🔒 Security are not expected from this subagent — escalate those to the appropriate subagent via the consolidation step if spotted incidentally.

---

## Step 3: Consolidation

After all 6 subagents complete, aggregate their findings:

1. Collect all findings (grouped by subagent marker type).
2. Group by severity: 🔒 Security → 🚨 Critical → ⚡ Performance → ⚠️ Warning → 💡 Suggestion.
3. Deduplicate findings at the same `{path, ~line}` from different subagents — note both subagents in the entry.
4. Collect one positive highlight per subagent.
5. **Gap detection:** Run `gh pr diff {PR_NUMBER} --name-only` to list all changed files. Cross-reference against files mentioned in findings. For any logic file with zero findings from any subagent, flag it in `### 🔍 Files With No Findings`. Omit a file from this section only if it is a config/lock file (`*.json` catalog, `*.yaml`, `pnpm-lock.yaml`) or a pure type declaration file.
6. Post the summary: `gh pr comment {PR_NUMBER} --body '...'` (confirm with user before posting if they prefer chat-only output).

**Summary format:**

```markdown
## 🤖 TBH PR Review Summary

| | |
|---|---|
| **PR** | #{PR_NUMBER} — {title} |
| **Author** | {author} |
| **CI** | pass / fail / unknown |
| **Spec** | `.specs/features/{slug}/spec.md` · found / not found |
| **Subagents** | 6 of 6 (Security · Spec · Tests · Architecture · Regression · Player UX) |
| **Docs loaded** | `CORE.md`, `MAIN.md`, `RENDERER.md`, `UX.md`, `DATA.md`, `CODING-GUIDELINES.md` |
| **Findings** | {N} across {M} files |

---

### 🔒 Security ({N})
- `path/file.ts` — Finding title

### 🚨 Critical ({N})
### ⚡ Performance ({N})
### ⚠️ Warnings ({N})
### 💡 Suggestions ({N})

---

### 📋 Spec Compliance
_(Summary from Subagent 2 — omit if no spec was found)_

---

### 🔍 Files With No Findings
- `path/to/file.ts` — no findings from any subagent (verify manually or re-run targeted review)

_(Omit this section if all logic files received at least one finding or explicit clean assessment.)_

---

### 🎮 Player Experience
_(Summary from Subagent 6 — omit if no renderer changes)_

---

### ✅ Highlights
- [Security] One well-done aspect
- [Spec] One well-done aspect
- [Tests] One well-done aspect
- [Architecture] One well-done aspect
- [Regression] One well-done aspect
- [Player UX] One well-done aspect

---

> **Advisory only** — CI (`pnpm qa`) is the hard gate. See [docs/agent/QA.md](docs/agent/QA.md).
```

If no findings across all subagents: post `✅ No issues found across all review dimensions.` but still include the metadata table and highlights.

---

## Hard rules

1. Never push, merge, or close the PR unless the user explicitly requests it.
2. Never modify files in the working tree during review.
3. If git checkout is needed (e.g. for local QA), preserve working tree first — see original workflow in previous skill version.
4. State clearly when dev smoke was not run (this skill works from `gh pr diff` only — no local app launch).
5. Do not re-run `pnpm qa` locally unless CI failed or the user specifically asks.

## Related

- Architecture: `docs/ARCHITECTURE.md`
- Layer docs: `docs/agent/layers/`
- QA gate: `docs/agent/QA.md`
- Git rules: `docs/agent/GIT.md`
- Contributor template: `.github/pull_request_template.md`
- Spec format: `.specs/features/` (generated by `tlc-spec-driven` skill)
