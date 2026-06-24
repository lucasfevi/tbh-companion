# Bundled data catalogs

`data/*.json` at the **repo root** are the editable source catalogs (box types, pets, lookup tables, Steam fees, etc.). At runtime, `core/bundledData.ts` resolves them from dev paths or from `resources/data/` in a packaged install.

**Packaged installs do not ship repo `data/` directly.** `app/scripts/minify-and-copy-data.mjs` minifies every `data/*.json` into `app/dist/data/` and copies `data/icons/` → `app/dist/data/icons/`. electron-builder `extraResources` ships `dist/data` as `resources/data/`. Dev reads pretty-printed JSON from repo `data/`; the installer gets minified copies only.

## Packaging and minify

| Stage | Path | Notes |
|-------|------|--------|
| **Edit** | repo `data/*.json` | Keep pretty-printed (readable diffs). BOM-free UTF-8. |
| **Icons** | repo `data/icons/*.png` | Required for packaged UI; copied by minify script. |
| **Stage for release** | `app/dist/data/` | Generated — **do not edit by hand**. |
| **Installed app** | `resources/data/` | Resolved via `process.resourcesPath` in `bundledData.ts`. |

From `app/`:

```powershell
pnpm run minify-and-copy-data   # data/*.json -> dist/data/*.json (minified) + icons
```

Also runs automatically as part of `pnpm run qa`, `pnpm run pack`, and `pnpm run dist`. After changing `data/*.json` or icons, `pnpm run qa` is enough to refresh `dist/data/` locally; commit only repo `data/` changes, not `app/dist/` (build output).

## Adding or changing a catalog file

1. **Add/edit the JSON** under repo-root `data/` (not `app/data/` — the dev-mode search path is `app/../data`, i.e. repo root).
2. **Register the filename** in `REQUIRED_BUNDLED_DATA_FILES` in `app/src/core/bundledData.ts` if it's new. `app/test/core/bundledData.test.ts` loads every registered file in dev; a name missing here can work in dev (if the file exists) but is untested and may be omitted from packaging expectations.
3. **Load it** with `readBundledJson<T>(filename)` from a `catalog.ts` in the relevant `core/` domain (see [CORE.md](CORE.md) for the `catalog.ts`/`parse.ts`/`resolve.ts` pattern) — never read the file directly with `fs` outside `bundledData.ts`, and never resolve the path with bare `process.cwd()` (use `bundledDataCandidates`/`resolveBundledDataPath`, which already encode the packaged/dev/cwd search order).
4. **Write JSON BOM-free.** PowerShell's `Set-Content -Encoding UTF8` adds a BOM that breaks strict JSON parsers; generate/edit catalog files with Node (`fs.writeFileSync(path, JSON.stringify(data, null, 2))`) or hand-edit in an editor that doesn't add a BOM. `readBundledJson` strips a leading BOM defensively, but don't rely on that for files other tooling might read.
5. **Type it.** Add/update the TypeScript type the loader returns so consumers in `core/` get compile-time safety on the new shape.
6. **Regenerate agent catalog** — `pnpm run sync:agent-docs` from repo root (see [MAINTENANCE.md](../MAINTENANCE.md)).
7. **Verify** — `cd app; pnpm run qa` (includes minify-and-copy-data and checks `dist/data/icons`).

## Schema changes (renaming/removing a field or id)

Catalog ids and field names are referenced by parsing/resolve code throughout `core/` and sometimes by save-derived ids — a rename is a cross-cutting change, not a data-file-only one:

- Search `app/src/core/` and `app/test/core/` for the old field/id before renaming.
- Update the loader's TypeScript type so the compiler surfaces every call site.
- Run the affected domain's Vitest suite (loads the real catalog — see [CORE.md](CORE.md) § Testing) to catch drift the type system misses (e.g. a value, not just a key, changing meaning).

## Current catalogs

**Do not edit the table by hand.** Filenames are defined in `app/src/core/bundledData.ts` → `REQUIRED_BUNDLED_DATA_FILES`. Loader map is generated from code:

→ **[generated/bundled-data-catalog.md](../generated/bundled-data-catalog.md)**

After adding or renaming a catalog or loader, run `pnpm run sync:agent-docs` from repo root and commit the generated file. See [MAINTENANCE.md](../MAINTENANCE.md).

## Examples

### Example 1: New catalog file

User: "Add a catalog for hero base stats."

Actions: `data/hero_stats.json` (BOM-free), add `"hero_stats.json"` to `REQUIRED_BUNDLED_DATA_FILES`, loader in `core/` via `readBundledJson`, type the return shape, Vitest case that loads the real file, `pnpm run sync:agent-docs`, then `cd app; pnpm run qa` (minify + tests).

### Example 2: Renaming a field in an existing catalog

User: "Rename `cap` to `runeCap` in `rune_box_cap.json`."

Actions: grep `core/` and `test/core/` for `cap` usage tied to this catalog, update the JSON + loader type together, run `test/core/boxes.test.ts`, check `pnpm qa` bundle guards still pass.

## Troubleshooting

### Catalog loads in dev but fails in the packaged build

- Filename missing from `REQUIRED_BUNDLED_DATA_FILES`, or JSON not under repo `data/` before `pack`/`dist`.
- `pack`/`dist` skipped `minify-and-copy-data` — installer ships stale or empty `dist/data/`.
- Run `cd app; pnpm run qa` or `pnpm run minify-and-copy-data` and confirm `app/dist/data/<file>` exists.

### Packaged app missing item icons

`data/icons/` must exist at repo root; minify copies PNGs to `dist/data/icons/`. QA fails if that folder is empty after minify — see `app/scripts/qa-gate.mjs`.

### `JSON.parse` fails only when the file came from a PowerShell script

BOM. Re-save the file via Node (`fs.writeFileSync`) instead of `Set-Content -Encoding UTF8`. See [../WINDOWS.md](../WINDOWS.md).
