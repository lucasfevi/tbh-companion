# Agent doc maintenance

Keep the harness accurate without loading every doc into context. **Code and tests are the source of truth for facts that can drift; docs explain procedure and link to those facts.**

## Principles

1. **Do not hand-maintain inventories** (file lists, IPC channel tables, catalog maps) in prose docs when the repo already encodes them. Use generated snippets or point at the defining file.
2. **Update docs in the same PR** as the code change that made them wrong — not in a follow-up.
3. **Read maintenance rules only when relevant** — see triggers below; no agent needs `MAINTENANCE.md` for a read-only question.

## Source-of-truth map

| Fact | Authoritative location | Agent doc |
|------|------------------------|-----------|
| Bundled JSON filenames | `app/src/core/bundledData.ts` → `REQUIRED_BUNDLED_DATA_FILES` | [generated/bundled-data-catalog.md](generated/bundled-data-catalog.md) (generated) |
| Bundled JSON on disk | `data/*.json` (must match required list) | `bundledData.test.ts` loads every required file |
| IPC channel names | `app/shared/ipc.ts` | `docs/ARCHITECTURE.md` (behavior only) |
| Layer boundaries | `docs/ARCHITECTURE.md` + layer docs under `layers/` | Procedure, not duplicate tables |
| QA steps | `app/scripts/qa-gate.mjs` | [QA.md](QA.md) mirrors intent; script wins on exact commands |

## Generated docs

From repo root:

```powershell
pnpm run sync:agent-docs
pnpm run sync:agent-docs:check   # CI — fails if generated file stale
```

| Output | When to regenerate |
|--------|-------------------|
| `docs/agent/generated/bundled-data-catalog.md` | After changing `REQUIRED_BUNDLED_DATA_FILES`, adding/removing `readBundledJson` / `bundledDataPath` for a catalog, or renaming `data/*.json` |

Commit generated files with the code change that triggered them.

## Agent obligations (by task)

| If your change touches… | Also do… |
|-------------------------|----------|
| `data/*.json`, `bundledData.ts`, catalog loaders in `core/` or `main/` | Run `pnpm run sync:agent-docs`; commit generated catalog; follow [layers/DATA.md](layers/DATA.md) |
| `shared/ipc.ts`, preload, `main/ipc/` | Update `test/ipc/channels.test.ts`; fix any broken links in layer docs you touched |
| Renderer/main behavior documented in `layers/*.md` | Edit that layer doc **only if** user-visible rules changed; remove dead links (grep `docs/agent` for deleted paths) |
| Delete or rename a path referenced in docs | `rg "old/path" docs/agent` and fix in the same PR |
| Workflow skills under `.cursor/skills/` | `pnpm run sync:skills` |

## Link hygiene

Before marking doc work done:

- Prefer linking to **stable anchors**: `bundledData.ts`, `ARCHITECTURE.md`, generated files — not removed paths like `docs/design/branding.md`.
- If a doc says "see X" and X does not exist, either restore X or inline the one-line fact and drop the link.
- Layer docs may deep-link into `app/src/...` — verify those files still exist when you edit the doc.

## What stays hand-written

- **Procedure** — how to add a catalog, QA workflow, git/PR policy (`GIT.md`, `QA.md`, layer guides).
- **Judgment** — UX tone, coding guidelines, review checklists.
- **Domain knowledge** — `docs/SAVE_FORMAT.md`, `docs/findings/`, ADRs in `DECISIONS.md`.

Regenerate or grep-check inventories; do not copy them by hand.
