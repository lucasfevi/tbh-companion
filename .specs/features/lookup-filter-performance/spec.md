# Lookup Filter/Sort Performance — Specification

**Status:** Complete

## Problem Statement

Filtering and sorting on the Lookup tab felt delayed. The grid rendered all
matching `ItemCard`s (~1500 items in the worst case) with no memoization and no
content-visibility skipping, and every keystroke immediately re-ran the full
`filterAndSortItems` pass and re-rendered every card.

## Root causes (verified)

| Cause | Fix |
|-------|-----|
| `ItemCard` not memoized; re-renders every card on any filter change | `React.memo` on `ItemCard` |
| `onSelect` callback recreated inline each render — defeats memo | `useCallback`-wrapped `handleItemSelect` |
| All off-screen cards painted every frame | `[content-visibility:auto]` + `[contain-intrinsic-size:0_180px]` on each card |
| Every keystroke immediately triggers filter/sort + re-render | `useDeferredValue(query)` — input stays instant; filter runs at lower priority |

**Already resolved before this feature:**
- Option helpers (`gradeOptionsFromItems`, etc.) memoized in `Lookup.tsx` (done in `filtering-sorting-refinements`).

## Goals

- [x] Filtering/sorting feels instant (<~16ms perceived) on the full catalog.
- [x] Benchmark established in `app/test/bench/lookupFilter.bench.ts`.

## Out of Scope

- Windowing library (react-window / virtua) — CSS content-visibility is sufficient; add only if profiling shows it's needed.
- Web workers / offloading.
- Inventory and Offering Loot (Inventory already has `memo` + content-visibility; Offering Loot is ~10–20 rows).
- Saved filter presets / named views.

## Implementation

**Files changed:**

- `app/src/renderer/components/lookup/ItemCard.tsx` — `React.memo` + content-visibility
- `app/src/renderer/tabs/Lookup.tsx` — `useDeferredValue(query)` + stable `handleItemSelect`
- `app/test/bench/lookupFilter.bench.ts` — new filter/sort benchmark
- `docs/BENCHMARKS.md` — table entry for the new bench
