# Agent workflow — git, push, and PRs

Guidance for AI agents and contributors using Cursor (or similar) on this repo.

## Commits

- Use **Conventional Commits** (`feat:`, `fix:`, `docs:`, etc.).
- One focused commit per logical change; split large work into reviewable chunks.
- **Do not commit** unless the user asked for a commit (or their rules explicitly allow it).
- Never commit personal save data (`*.es3`, decrypted dumps, `sample/`).

See also `AGENTS.md` for QA and architecture expectations before marking work done.

## QA before push or PR

**Run `cd app; pnpm run qa` before every push and every PR** — including changes that only touch `data/*.json`, docs, or repo metadata.

- CI runs the same gate; do not open a PR with failing tests locally.
- For bundled catalog updates (`data/gamedata.json`, `data/stage_boxes.json`, `data/steam_item_nameids.json`, etc.): run QA and fix or revert any file that breaks tests. Not every tbh-data export is drop-in compatible with the companion (e.g. `stage_boxes.json` needs companion `tracker` metadata). Steam nameids: `npm run build:steam-nameids` in **tbh-data** (emit **A-only** gear hashes), then copy from `snapshots/v{version}/companion/`.
- Report QA results in the PR test plan (pass/fail, test count). See **tbh-qa** skill for the full checklist when `app/` code changed.

## Push — confirm first

**Never run `git push` (or `git push -u origin …`) without explicit user approval** in the current conversation.

After local commits are ready:

1. Run `cd app; pnpm run qa` (see above).
2. Summarize branch name, commit(s), what changed, and QA result.
3. Ask whether to push (e.g. “Want me to push `feat/my-branch` to origin?”).
4. Push only after the user says yes.

Do not assume “push after commit” or “push unless told otherwise.”

## Pull requests — confirm first

**Never run `gh pr create` (or open a PR via the GitHub UI on the user’s behalf) without explicit user approval.**

Before creating a PR:

1. Run `cd app; pnpm run qa` locally.
2. Ensure the branch is pushed (with user approval for the push).
3. Summarize title, scope, test plan, and QA result.
4. Ask whether to open the PR.
5. Create the PR only after the user says yes.

### PR body on Windows (PowerShell) — required pattern

**Do not** pass markdown inline to `gh pr create --body "..."` or `--body "$(...)""` on PowerShell. Backticks and `$` are interpreted or escaped incorrectly, which produces broken descriptions (literal `\data/file\` instead of `` `data/file` ``).

**Always** write the body to a file and pass it with `--body-file`:

```powershell
# 1. Write markdown to a UTF-8 file (Node avoids PowerShell escaping issues)
node -e @"
const fs = require('fs');
fs.writeFileSync('.pr-body.md', \`## Summary

- Replace bundled \`data/gamedata.json\` with game-extracted catalog from tbh-data v1.00.11.

## Test plan

- [x] \`cd app; pnpm run qa\` — pass
\`, 'utf8');
"@

# 2. Create or update the PR
gh pr create --title "your title" --body-file .pr-body.md

# 3. Remove the temp file (do not commit .pr-body.md)
Remove-Item .pr-body.md
```

Alternative: use the repo template as a starting file, edit it, then `gh pr create --body-file .github/pull_request_template.md` (only if you filled every section).

To fix a broken body after the fact: `gh pr edit <N> --body-file .pr-body.md`

## Safe defaults

| Action | Default |
|--------|---------|
| Local commit | Only when user requests (or their rules allow) |
| `pnpm run qa` before push/PR | **Always** |
| `git push` | **Ask first** |
| Open PR | **Ask first** |
| PR body via inline `--body` on PowerShell | **Never** — use `--body-file` |
| Force-push | Never unless user explicitly requests |
| Update CHANGELOG / semver | Only when user asks or release prep is in scope |

## PR review — `/review-pr <N>`

Advisory review for maintainers (not a merge gate — CI runs `pnpm run qa`).

1. Invoke `/review-pr 39` or “review PR #39” in Cursor or Claude Code.
2. Agent reads **tbh-reviewer** (`.cursor/skills/` or `.claude/skills/`), stashes local WIP if needed, checks out the PR branch, and posts the advisory template.
3. Agent restores your branch and stash when done.

Contributor self-check: `.github/pull_request_template.md`.

## Skills sync (Cursor + Claude)

Edit skills in `.cursor/skills/`. Mirror to Claude:

```powershell
pnpm run sync:skills
```

Commit both `.cursor/skills/` and `.claude/skills/`. CI runs `pnpm run sync:skills:check` when skill paths change.

## Related docs

- `AGENTS.md` — project brief, build/QA, architecture
- `CLAUDE.md` — Claude Code entry + skill paths
- `.cursor/rules/git-remote-confirm.mdc` — always-on Cursor reminder for push/PR confirmation
