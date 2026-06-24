# Git — commits and branches

## Commits

- Use **Conventional Commits** (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`).
- One focused commit per logical change; split large work into reviewable chunks.
- **Do not commit** unless the user asked for a commit (or their rules explicitly allow it).
- Do not add a `Co-Authored-By:` trailer for any AI agent/assistant.
- Never commit personal save data (`*.es3`, decrypted dumps, `sample/`).

## Branches

- Name as `<type>/<short-description>` (e.g. `fix/save-watcher-race`, `feat/box-tracker-filters`) using the same `type` prefixes as commits.
- Never use a generic `claude/...` session name for a branch you push or open a PR from.

## Force push

Never force-push unless the user explicitly requests it. Never force-push to `main`/`master` without warning.

## Before push or PR

Run QA and follow [PULL-REQUEST.md](PULL-REQUEST.md). See [QA.md](QA.md) for the full gate.
