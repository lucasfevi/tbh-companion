# Lookup/Filter Performance — Specification (stub)

Deferred follow-up (user decision R8): plan and execute AFTER
`filtering-sorting-refinements` ships. This stub captures the problem so the
investigation isn't lost.

## Problem Statement

Filtering and sorting on Lookup feels delayed; the user suspects Offering and
Inventory may share the issue. Lookup renders a large catalog (~1500 items) as a
grid with no virtualization, recomputing `filterAndSortItems` + re-rendering all
`ItemCard`s on every keystroke / filter change.

## Suspected causes (to verify during Design)

- **No list virtualization** on the Lookup grid (`<ul>` of `ItemCard`) — every
  matching item mounts a card. Likely the biggest win.
- **Filter/sort recompute per keystroke** with no debounce on the search query.
- **Option helpers** (`gradeOptionsFromItems`, grouping helpers, etc.) recomputed
  in `Lookup.tsx` render without `useMemo` (currently called inline in JSX props).
- Per-item work in the predicate (effect scan over `gearGroups`) on every pass.

## Goals (draft)

- [ ] Filtering/sorting feels instant (<~16ms perceived) on the full catalog.
- [ ] Establish a benchmark (see `docs/BENCHMARKS.md`) to measure before/after.

## Likely directions (to design)

- Virtualize the Lookup grid (and re-check Inventory table / Offering list).
- Debounce search input; memoize option/group derivations.
- Profile with the existing bench harness; add a filter/sort bench.

## Out of Scope (for now)

- Web workers / offloading (only if profiling proves CPU-bound beyond the above).

**Status**: Stub — not yet specified in full. Pick up after refinements merge.
