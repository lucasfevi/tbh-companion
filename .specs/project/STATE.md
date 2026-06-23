# Project State — Memory

Persistent decisions, blockers, lessons, and deferred ideas across sessions.

## Active feature

- **lookup-filter-performance** — **Complete** on branch `feat/filtering-sorting-evolution`.
  `React.memo` + `[content-visibility:auto]` on `ItemCard`, `useCallback` for `onSelect`,
  `useDeferredValue(query)` in `Lookup.tsx`. Benchmark added at
  `app/test/bench/lookupFilter.bench.ts`. [R8]
- **filtering-sorting-refinements** — **Complete & committed** on branch
  `feat/filtering-sorting-evolution` (9 atomic commits + docs commit). Chrome
  consistency (count "{n} items" beside search, no search label, checkboxes for
  toggles), Coin view = search-only, Inventory reposition/renames, Lookup
  adaptive setups + grouped Modifier/Gear type + segmented sort, MultiSelect
  padding bug (root cause: `Combobox.Empty` wrapper always in DOM — moved
  padding into child span), Storybook checkbox stories. Deviations: deleted
  orphaned FilterBar, added Select `triggerClassName`, memoized Lookup option
  helpers. `pnpm run qa` + `qa:dev` green.
- **filtering-sorting-evolution** — **Complete & committed** (12 atomic
  commits). `qa` + `qa:dev` were green.

## Decisions

- 2026-06-23 — "Coin view" = the Offering Loot panel (`OfferingLoot.tsx`). [D1]
- 2026-06-23 — Adopt `lucide-react` for sort asc/desc icons (was text `▲▼`). [D2]
- 2026-06-23 — Filter selections are session-only; no config/IPC persistence. [D3]
- 2026-06-23 — Remove the material `targetGroup` / "Applies to anything" filter entirely
  ("Common" = effect applies to any slot; confusing — drop the control + helpers + filter branch). [D4]
- 2026-06-23 — Inventory sort stays on its data table; the new grouped sort control is
  Lookup + Coin view only.
- 2026-06-23 — Lookup perf: reuse Inventory's `memo` + `[content-visibility:auto]` pattern on
  `ItemCard`; use `useDeferredValue` for search (no windowing lib needed). [R8]

## Deferred ideas

- Saved filter presets / named views (out of scope for this feature).
- Reusing the RangeSlider for inventory value/price/count ranges and Coin view drop-% (P3,
  opt-in during Design).

## Lessons

- pnpm on Windows may skip a new dependency's build/postinstall script — allow-list
  `lucide-react` in `app/pnpm-workspace.yaml` `allowBuilds` if icons fail to resolve.
