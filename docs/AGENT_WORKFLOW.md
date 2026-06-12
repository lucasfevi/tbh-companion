# Agent workflow — git, push, and PRs

Guidance for AI agents and contributors using Cursor (or similar) on this repo.

## Commits

- Use **Conventional Commits** (`feat:`, `fix:`, `docs:`, etc.).
- One focused commit per logical change; split large work into reviewable chunks.
- **Do not commit** unless the user asked for a commit (or their rules explicitly allow it).
- Never commit personal save data (`*.es3`, decrypted dumps, `sample/`).

See also `AGENTS.md` for QA and architecture expectations before marking app work done.

## Push — confirm first

**Never run `git push` (or `git push -u origin …`) without explicit user approval** in the current conversation.

After local commits are ready:

1. Summarize branch name, commit(s), and what changed.
2. Ask whether to push (e.g. “Want me to push `feat/my-branch` to origin?”).
3. Push only after the user says yes.

Do not assume “push after commit” or “push unless told otherwise.”

## Pull requests — confirm first

**Never run `gh pr create` (or open a PR via the GitHub UI on the user’s behalf) without explicit user approval.**

Before creating a PR:

1. Ensure the branch is pushed (with user approval for the push).
2. Summarize title, scope, and test plan.
3. Ask whether to open the PR.
4. Create the PR only after the user says yes.

Use `--body-file` for long PR descriptions on Windows (see past PRs in this repo).

## Safe defaults

| Action | Default |
|--------|---------|
| Local commit | Only when user requests (or their rules allow) |
| `git push` | **Ask first** |
| Open PR | **Ask first** |
| Force-push | Never unless user explicitly requests |
| Update CHANGELOG / semver | Only when user asks or release prep is in scope |

## PR review — `/review-pr <N>`

Advisory review for maintainers (not a merge gate — CI runs `npm run qa`).

1. Invoke `/review-pr 39` or “review PR #39” in Cursor or Claude Code.
2. Agent reads **tbh-reviewer** (`.cursor/skills/` or `.claude/skills/`), stashes local WIP if needed, checks out the PR branch, and posts the advisory template.
3. Agent restores your branch and stash when done.

Contributor self-check: `.github/pull_request_template.md`.

## Skills sync (Cursor + Claude)

Edit skills in `.cursor/skills/`. Mirror to Claude:

```powershell
npm run sync:skills
```

Commit both `.cursor/skills/` and `.claude/skills/`. CI runs `npm run sync:skills:check` when skill paths change.

## Related docs

- `AGENTS.md` — project brief, build/QA, architecture
- `CLAUDE.md` — Claude Code entry + skill paths
- `.cursor/rules/git-remote-confirm.mdc` — always-on Cursor reminder for push/PR confirmation
