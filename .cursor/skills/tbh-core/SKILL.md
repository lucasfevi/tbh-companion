---
name: tbh-core
description: TBH Companion core/ logic layer — pure parsers, calculators, and catalog resolvers under app/src/core/. Use when adding or changing save parsing, stat/price calculations, box/pet/inventory resolution logic, or any app/src/core/** file. Covers module layout, purity rules, and Vitest conventions for core. Not for IPC wiring (tbh-main), bundled JSON catalog files themselves (tbh-data), or renderer/UI (tbh-renderer, tbh-ux).
license: CC-BY-4.0
metadata:
  author: tbh-project
  version: 1.0.0
---

# TBH Companion — core logic layer

`app/src/core/` is the framework-free heart of the app: save parsing, stat math, pricing, and catalog resolution. It is the one layer every other layer depends on, so keeping it pure and well-tested is what makes the rest of the app easy to reason about.

## Hard rule: stay pure

`core/` must never import `electron`, `node:fs`, `fetch`, or React. It takes plain data in and returns plain data (or throws/returns a result) out — no file reads, no network, no logging, no DOM.

- **Reads bytes? That's `main/`'s job.** `core/` parses bytes/JSON that main already read.
- **Needs a log line? That's `main/`'s job.** Return a result or throw; `main/` wraps with `createLogger`. See **tbh-main**.
- **Needs a bundled JSON catalog?** Use `readBundledJson` from `core/bundledData.ts` — this is the one sanctioned exception, since it does a synchronous `fs.readFileSync` but stays side-effect-free in behavior (same file in, same data out). See **tbh-data** for catalog file conventions, schema, and registration.

This boundary is what lets `core/` run in Vitest with zero mocking — if a test needs to mock `fs` or `electron`, the logic being tested probably belongs in `main/` instead.

## Module layout

Most domains follow the same shape, visible in `core/boxes/`, `core/pets/`, `core/inventory/`:

| File | Role |
|------|------|
| `catalog.ts` | Loads + types a bundled JSON catalog via `readBundledJson` |
| `parse.ts` | Turns raw save fields into typed domain objects |
| `resolve.ts` | Joins parsed save data with catalog data into display-ready rows |
| `index.ts` | Re-exports the domain's public surface |

Single-file domains (`tracker.ts`, `grades.ts`, `marketName.ts`, `steamPrice.ts`) are fine when there's no catalog or multi-step pipeline — don't force the four-file split on something that's one pure function.

New domain logic: follow whichever pattern matches its shape rather than inventing a new structure. If unsure where something goes, prefer extending an existing module over a new top-level file.

## Testing

Every behavior change in `core/` needs Vitest coverage in `app/test/core/`. Patterns already in use:

- Load real catalogs in tests (`loadBoxTypeCatalog()`, `loadRuneBoxCapCatalog()`) rather than hand-rolling fixture catalogs — this catches catalog/logic drift for free.
- Prefer `toMatchObject` for partial shape checks on resolved rows; full `toEqual` when the whole shape matters.
- One `describe` per exported function, one `it` per behavior (not per input value) — table-driven `it.each` when the same assertion repeats across many inputs.
- Edge cases worth a dedicated test: missing/zero-quantity entries, unknown catalog ids, malformed save fields — these mirror real corrupt-save reports more than happy-path values do.

`pnpm run qa` (see **tbh-qa**) runs the full suite — run targeted tests with `pnpm exec vitest run test/core/<file>.test.ts` while iterating.

## Examples

### Example 1: New stat calculation

User: "Add a function to compute idle XP/hour from the last two snapshots."

Actions: pure function in `core/` (new file or extend `tracker.ts` if it's tracker-shaped), typed inputs/outputs, no logging, Vitest covering zero-delta and negative-delta (save rollback) cases.

### Example 2: New catalog-backed resolver

User: "Resolve pet rarity from the pet catalog."

Actions: `loadPetCatalog()` in `pets/catalog.ts` (or extend it), `resolve.ts` joins parsed pet ids to catalog entries, test with the real bundled catalog plus an unknown-id case.

## Troubleshooting

### Test needs to mock `fs` or `electron`

The logic under test isn't pure — move the I/O-touching part to `main/` and keep only the transformation in `core/`. See **tbh-main**.

### Catalog shape changed and tests broke everywhere

The catalog's JSON contract changed. Fix the catalog file and `catalog.ts` loader/types together — see **tbh-data** for the registration and schema-change checklist.
