---
name: tbh-data
description: TBH Companion bundled JSON catalogs under data/ (gamedata, stage_boxes, box_types, rune_box_cap, pets, steam_item_nameids, steam_market_fee). Use when adding, removing, or changing a bundled data/*.json file, its REQUIRED_BUNDLED_DATA_FILES registration, or the catalog loader that reads it. Not for save-file parsing or calculation logic that consumes the loaded catalog (tbh-core), or IPC/network that fetches live prices (tbh-main).
license: CC-BY-4.0
metadata:
  author: tbh-project
  version: 1.0.0
---

# TBH Companion — bundled data catalogs

`data/*.json` files ship with the app via electron-builder `extraResources` and are read once at startup through `core/bundledData.ts`. They're the static reference data (box types, pet stats, stage→box mappings, Steam market fees) that `core/` joins against parsed save data.

## Adding or changing a catalog file

1. **Add/edit the JSON** under repo-root `data/` (not `app/data/` — the dev-mode search path is `app/../data`, i.e. repo root).
2. **Register the filename** in `REQUIRED_BUNDLED_DATA_FILES` in `app/src/core/bundledData.ts` if it's new. This list is what `qa`'s bundle checks and the build verify exist in packaged resources — a catalog missing from this list can load fine in dev and silently fail in the packaged app.
3. **Load it** with `readBundledJson<T>(filename)` from a `catalog.ts` in the relevant `core/` domain (see **tbh-core** for the `catalog.ts`/`parse.ts`/`resolve.ts` pattern) — never read the file directly with `fs` outside `bundledData.ts`, and never resolve the path with bare `process.cwd()` (use `bundledDataCandidates`/`resolveBundledDataPath`, which already encode the packaged/dev/cwd search order).
4. **Write JSON BOM-free.** PowerShell's `Set-Content -Encoding UTF8` adds a BOM that breaks strict JSON parsers; generate/edit catalog files with Node (`fs.writeFileSync(path, JSON.stringify(data, null, 2))`) or hand-edit in an editor that doesn't add a BOM. `readBundledJson` strips a leading BOM defensively, but don't rely on that for files other tooling might read.
5. **Type it.** Add/update the TypeScript type the loader returns so consumers in `core/` get compile-time safety on the new shape.

## Schema changes (renaming/removing a field or id)

Catalog ids and field names are referenced by parsing/resolve code throughout `core/` and sometimes by save-derived ids — a rename is a cross-cutting change, not a data-file-only one:

- Search `app/src/core/` and `app/test/core/` for the old field/id before renaming.
- Update the loader's TypeScript type so the compiler surfaces every call site.
- Run the affected domain's Vitest suite (loads the real catalog — see **tbh-core** § Testing) to catch drift the type system misses (e.g. a value, not just a key, changing meaning).

## Current catalogs

| File | Loaded by |
|------|-----------|
| `gamedata.json` | `core/gamedata.ts` |
| `stage_boxes.json` | `core/stageBoxes.ts` |
| `box_types.json` | `core/boxes/catalog.ts` |
| `rune_box_cap.json` | `core/boxes/catalog.ts` |
| `pets.json` | `core/pets/catalog.ts` |
| `steam_item_nameids.json` | inventory pricing lookup |
| `steam_market_fee.json` | `core/steamMarketFee.ts` |

## Examples

### Example 1: New catalog file

User: "Add a catalog for hero base stats."

Actions: `data/hero_stats.json` (BOM-free), add `"hero_stats.json"` to `REQUIRED_BUNDLED_DATA_FILES`, `core/heroes.ts` (or a new `heroes/catalog.ts`) loads it via `readBundledJson`, type the return shape, add a Vitest case that loads the real file.

### Example 2: Renaming a field in an existing catalog

User: "Rename `cap` to `runeCap` in `rune_box_cap.json`."

Actions: grep `core/` and `test/core/` for `cap` usage tied to this catalog, update the JSON + loader type together, run `test/core/boxes.test.ts`, check `pnpm run qa` bundle guards still pass.

## Troubleshooting

### Catalog loads in dev but fails in the packaged build

Filename missing from `REQUIRED_BUNDLED_DATA_FILES`, or the file wasn't added to `data/` before building. Check `pnpm run qa`'s bundle checks — see **tbh-qa**.

### `JSON.parse` fails only when the file came from a PowerShell script

BOM. Re-save the file via Node (`fs.writeFileSync`) instead of `Set-Content -Encoding UTF8`.
