# Filtering & Sorting Evolution — Tasks

**Design**: `.specs/features/filtering-sorting-evolution/design.md`
**Spec**: `.specs/features/filtering-sorting-evolution/spec.md`
**Status**: Done (T1–T14 implemented & verified; `pnpm run qa` + `qa:dev` green; uncommitted)

---

## Test coverage matrix (derived from project conventions — no `.specs/codebase/TESTING.md` yet)

This is a mature brownfield with documented testing conventions (AGENTS.md, design-system skill).
Applied matrix:

| Code layer | Required tests | Quick gate | Full gate |
|------------|----------------|------------|-----------|
| `design-system/primitives/**` | unit — Vitest/Testing-Library `.test.tsx` + `jest-axe` smoke + a `.stories.tsx` per state | `pnpm test` | `pnpm run qa` |
| `renderer/lib/**` pure filter logic | unit — Vitest in `app/test/renderer/**` | `pnpm test` | `pnpm run qa` |
| `renderer/components/**` filter/tab wiring | none (matches existing — `InventoryFilters.tsx`, `LookupFilters.tsx`, `OfferingLoot.tsx` have no component tests; their branching logic lives in `lib/` and is unit-tested there). Verified via typecheck + build + dev smoke. | `pnpm run typecheck` | `pnpm run qa` + dev smoke |
| `renderer/components/filters/SortControl` | unit — it carries toggle behavior worth a small Testing-Library test | `pnpm test` | `pnpm run qa` |
| `styles.css`, `package.json` config | none | `pnpm run typecheck` / build | `pnpm run qa` |

> `Tests: none` for surface-integration tasks is **not** deferral — the conditional logic is
> fully covered by the `lib/` unit tasks (T8–T10). Integration tasks only wire props.

**Parallelism:** Vitest runs file-isolated → unit tests are parallel-safe. The bottleneck is
the single `pnpm run qa` build, run once as the capstone (T14), not per parallel task.

---

## Execution Plan

### Phase 1 — Foundations (all parallel `[P]`)
Independent primitives, global styling, the dependency add, the layout wrapper, and the three
pure-logic refactors. Nine tasks, no inter-dependencies.

```
[P] T1  MultiSelect primitive
[P] T2  RangeSlider primitive
[P] T3  Checkbox primitive
[P] T4  Add lucide-react dependency
[P] T5  Global scrollbar styling
[P] T7  FilterBar layout composite
[P] T8  lookupFilters.ts refactor
[P] T9  inventoryFilters.ts refactor
[P] T10 offeringLootFilters.ts refactor
```

### Phase 2 — SortControl (needs lucide)
```
T4 ──→ T6  SortControl composite
```

### Phase 3 — Surface integrations (all parallel `[P]`, different files)
```
T1,T2,T6,T7,T8 ──→ T11  Lookup integration
T1,T3,T7,T9     ──→ T12  Inventory integration
T1,T6,T7,T10    ──→ T13  Coin view (OfferingLoot) integration
```

### Phase 4 — Capstone QA (sequential)
```
T11,T12,T13 ──→ T14  Full QA + dev smoke
```

---

## Task Breakdown

### T1: MultiSelect primitive [P]

**What**: New searchable, groupable, multi-value, clearable dropdown primitive on Base UI Combobox.
**Where**: `app/src/renderer/design-system/primitives/MultiSelect/{MultiSelect.tsx,MultiSelect.stories.tsx,MultiSelect.test.tsx}` (+ sibling `multiSelectVariants.ts` if a `cva` object is exported — Fast Refresh rule).
**Depends on**: None
**Reuses**: `Select`'s trigger/popup cva + reserved-footer layout-stability pattern; `design-system/lib/variants.ts`.
**Requirement**: FILT-01, FILT-02, FILT-04, FILT-05

**Tools**: Skill: `design-system` (+ `tbh-renderer`)

**Done when**:
- [ ] Props per design: `options` (flat `MultiSelectOption[]` or grouped `MultiSelectGroup[]`), `value: string[]`, `onValueChange`, `label?`, `searchable?` (default true), `allLabel?`, `summarize?`, `disabled?`, `className?`, `title?`.
- [ ] `value: []` → trigger shows `allLabel`; selecting toggles membership; per-option checked indicator via Combobox `item-indicator`.
- [ ] Clear (✕) affordance appears when `value.length > 0` and empties selection.
- [ ] Searchable: in-popup input filters options; group labels with zero matches hide; `empty` state renders when nothing matches.
- [ ] Stories cover: single-group flat, grouped, searchable-long-list, with-selection, empty-state.
- [ ] Test count: ≥ existing + new MultiSelect tests pass (axe smoke included).
- [ ] Gate check passes: `pnpm test`

**Tests**: unit · **Gate**: quick
**Commit**: `feat(design-system): add MultiSelect primitive (searchable, grouped, multi)`

---

### T2: RangeSlider primitive [P]

**What**: New dual-thumb numeric range primitive on Base UI Slider (bounds supplied by consumer; range-agnostic).
**Where**: `app/src/renderer/design-system/primitives/RangeSlider/{RangeSlider.tsx,RangeSlider.stories.tsx,RangeSlider.test.tsx}`
**Depends on**: None
**Reuses**: ProgressBar/CapacityBar token palette; `variants.ts`.
**Requirement**: FILT-06

**Tools**: Skill: `design-system`

**Done when**:
- [ ] Props: `min`, `max`, `step?` (default 1), `value: [number, number]`, `onValueChange`, `label?`, `formatValue?` (default `Lv {n}`), `disabled?`, `className?`.
- [ ] Two thumbs bound to the array value; current `[lo, hi]` shown beside the label.
- [ ] Primitive does NOT derive bounds from any item set (fixed bounds are the consumer's job — D5).
- [ ] Stories: default, mid-range value, disabled.
- [ ] Gate check passes: `pnpm test`
- [ ] Test count: new RangeSlider tests pass (axe smoke included).

**Tests**: unit · **Gate**: quick
**Commit**: `feat(design-system): add RangeSlider primitive`

---

### T3: Checkbox primitive [P]

**What**: New themed standalone checkbox primitive on Base UI Checkbox.
**Where**: `app/src/renderer/design-system/primitives/Checkbox/{Checkbox.tsx,Checkbox.stories.tsx,Checkbox.test.tsx}`
**Depends on**: None
**Reuses**: `Switch` token-styling approach; `variants.ts`.
**Requirement**: FILT-11

**Tools**: Skill: `design-system`

**Done when**:
- [ ] Props: `checked`, `onCheckedChange`, `label?`, `disabled?`, `aria-label?`, `className?`; token-styled box + check Indicator.
- [ ] Stories: unchecked, checked, with-label, disabled.
- [ ] Gate check passes: `pnpm test`
- [ ] Test count: new Checkbox tests pass (axe smoke included).

**Tests**: unit · **Gate**: quick
**Commit**: `feat(design-system): add Checkbox primitive`

---

### T4: Icon source (NO-OP — use existing react-icons/lu) [P]

**What**: ~~Add lucide-react~~ — **revised (D2)**: `app/` already depends on `react-icons` 5.6.0
which bundles Lucide via `react-icons/lu`. No dependency change needed.
**Where**: n/a (verification only)
**Depends on**: None
**Reuses**: existing `react-icons/lu`.
**Requirement**: FILT-09

**Tools**: none

**Done when**:
- [x] Confirmed `react-icons/lu` exports `LuArrowUpNarrowWide`, `LuArrowDownNarrowWide`,
  `LuCheck`, `LuX` (verified against `node_modules/react-icons/lu/index.d.ts`).
- [x] Stray `lucide-react` removed from root `package.json` (it was added there by mistake).

**Tests**: none · **Gate**: n/a
**Commit**: none (no code change)

---

### T5: Global scrollbar styling [P]

**What**: App-wide themed scrollbars via `::-webkit-scrollbar` rules using `@theme` tokens.
**Where**: `app/src/renderer/styles.css`
**Depends on**: None
**Reuses**: existing `@theme` tokens (`--color-border`, `--color-muted`, `--color-panel`).
**Requirement**: FILT-12

**Tools**: Skill: `tbh-ux` (+ `design-system` tokens)

**Done when**:
- [ ] `::-webkit-scrollbar`, `-thumb`, `-track` styled with tokens; covers tabs, popups, `DataList`, Base UI portals.
- [ ] No overlay regression (overlay scroll areas, if any, still look right).
- [ ] Gate check passes: `pnpm run typecheck` (visual confirmed in T14 dev smoke).

**Tests**: none · **Gate**: build
**Commit**: `style(renderer): theme scrollbars app-wide`

---

### T6: SortControl composite

**What**: Grouped sort control = "Sort by" `Select` + direction toggle `Button` with lucide asc/desc icons.
**Where**: `app/src/renderer/components/filters/SortControl.tsx` (+ `SortControl.test.tsx`)
**Depends on**: T4
**Reuses**: existing `Select`, `Button` (`variant="icon" size="sm"`); replaces text `▲▼`.
**Requirement**: FILT-08, FILT-09

**Tools**: Skill: `design-system` + `tbh-renderer`

**Done when**:
- [ ] Props: `options`, `sortKey`, `onSortKeyChange`, `sortDir`, `onSortDirToggle`, `label?` (default "Sort by", top-positioned).
- [ ] Direction button renders lucide `ArrowUpNarrowWide`/`ArrowDownNarrowWide` (or `ArrowUp`/`ArrowDown`) reflecting `sortDir`; toggling flips icon + calls handler.
- [ ] Small Testing-Library test: toggle fires handler; correct icon/aria per direction.
- [ ] Gate check passes: `pnpm test`
- [ ] Test count: new SortControl tests pass.

**Tests**: unit · **Gate**: quick
**Commit**: `feat(filters): add SortControl with lucide direction icons`

---

### T7: FilterBar layout composite [P]

**What**: Shared labelled-filter layout wrapper with a stable, non-reflowing result-count slot.
**Where**: `app/src/renderer/components/filters/FilterBar.tsx` (+ `FilterBar.stories.tsx` optional)
**Depends on**: None
**Reuses**: Inventory header order (tbh-ux); `docs/STYLING.md` layout-stability rule.
**Requirement**: FILT-13, FILT-14

**Tools**: Skill: `tbh-ux` (+ `design-system`)

**Done when**:
- [ ] Renders filter children with consistent gap + sensible wrap; exposes a dedicated `count`/right slot so "{n} shown" position is independent of active filters.
- [ ] Labels (from child controls) sit at the top of each control; alignment holds on narrow widths.
- [ ] Gate check passes: `pnpm run typecheck`

**Tests**: none · **Gate**: build
**Commit**: `feat(filters): add FilterBar layout with stable count slot`

---

### T8: lookupFilters.ts refactor [P]

**What**: Migrate Lookup filter state to multi-select + fixed-range level + remove targetGroup; update unit tests.
**Where**: `app/src/renderer/lib/lookupFilters.ts`, `app/test/renderer/lookupFilters.test.ts`
**Depends on**: None
**Reuses**: existing `*OptionsFrom*` helpers, `GRADE_RANK`, `classForGearType`.
**Requirement**: FILT-03, FILT-07, FILT-15

**Tools**: Skill: `tbh-core` (pure logic) + `tbh-renderer`

**Done when**:
- [ ] State fields `typeFilter/gradeFilter/gearTypeFilter/classFilter/materialKindFilter/effectFilter` → `string[]`; predicate `sel.length===0 || sel.includes(value)` (OR-within).
- [ ] `minLevel/maxLevel` → `levelRange: [number, number]`; add `LEVEL_MIN=1`/`LEVEL_MAX=100`; material-safe predicate: `isFullRange || item.level==null || in-range`.
- [ ] `targetGroupFilter` state + branch removed; `targetGroupOptionsFromItems` removed; `levelOptionsFromItems` removed (now unused).
- [ ] Tests updated + added: OR-within semantics, AND-across, material-safe level, full-range no-op, removed-filter regressions.
- [ ] Gate check passes: `pnpm test`
- [ ] Test count: ≥ prior lookupFilters test count (no silent deletions; net new cases added).

**Tests**: unit · **Gate**: quick
**Commit**: `refactor(lookup): multi-select filters, fixed level range, drop targetGroup`

---

### T9: inventoryFilters.ts refactor [P]

**What**: Migrate Inventory filter state grade/type/location to multi-select; update unit tests. (Sort untouched.)
**Where**: `app/src/renderer/lib/inventoryFilters.ts`, `app/test/renderer/inventoryFilters.test.ts`
**Depends on**: None
**Reuses**: `rowMatchesLocation`, `GRADE_RANK`.
**Requirement**: FILT-03

**Tools**: Skill: `tbh-core` + `tbh-renderer`

**Done when**:
- [ ] `gradeFilter/typeFilter` → `string[]`; `locationFilter: LocationFilter` → `LocationFilter[]`; predicates OR-within (location uses `rowMatchesLocation` over the set).
- [ ] `emptyInventoryFilterMessage` updated for the array location shape.
- [ ] Sort logic (`filterAndSortRows` ordering, `defaultSortDir`) unchanged.
- [ ] Tests updated + added for OR-within across grade/type/location.
- [ ] Gate check passes: `pnpm test`
- [ ] Test count: ≥ prior inventoryFilters test count (net new cases added).

**Tests**: unit · **Gate**: quick
**Commit**: `refactor(inventory): multi-select grade/type/location filters`

---

### T10: offeringLootFilters.ts refactor [P]

**What**: Migrate Coin view (Offering Loot) grade/type filters to multi-select; add a co-located unit test.
**Where**: `app/src/renderer/lib/offeringLootFilters.ts`, **new** `app/test/renderer/offeringLootFilters.test.ts`
**Depends on**: None
**Reuses**: existing loot resolve/sort helpers.
**Requirement**: FILT-03

**Tools**: Skill: `tbh-core` + `tbh-renderer`

**Done when**:
- [ ] `gradeFilter/typeFilter` → `string[]`; predicate OR-within; sort unchanged.
- [ ] New test file covers OR-within, AND-across, empty=all, and sort stability.
- [ ] Gate check passes: `pnpm test`
- [ ] Test count: new offeringLootFilters tests pass.

**Tests**: unit · **Gate**: quick
**Commit**: `refactor(lookup): multi-select offering-loot filters + tests`

---

### T11: Lookup integration [P]

**What**: Wire Lookup's filter UI to the new primitives/composites and remove the targetGroup control.
**Where**: `app/src/renderer/components/lookup/LookupFilters.tsx`, `app/src/renderer/tabs/Lookup.tsx`
**Depends on**: T1, T2, T6, T7, T8
**Reuses**: `Switch` (existing), `effectOptionsFromItems` (grouped feed), `handleTypeFilterChange`.
**Requirement**: FILT-03, FILT-07, FILT-08, FILT-10, FILT-13, FILT-14, FILT-15

**Tools**: Skill: `tbh-renderer` + `tbh-ux` + `design-system`

**Done when**:
- [ ] `MultiSelect` for type/grade/effect(searchable)/gearType/class/materialKind; effect list may use grouping.
- [ ] `RangeSlider` (1–100, persistent) replaces both level selects; `SortControl` replaces inline select+`▲▼`; `Switch` for `uniqueOnly`.
- [ ] targetGroup control removed; `handleTypeFilterChange` clears gear/material multi sub-filters but NOT `levelRange`; `levelOptions` prop dropped.
- [ ] Wrapped in `FilterBar`; every filter has a top label; "{n} shown" in the stable count slot.
- [ ] State in `Lookup.tsx` updated to `string[]` / `levelRange`; passes typecheck.
- [ ] Gate check passes: `pnpm run typecheck`

**Tests**: none (logic covered by T8) · **Gate**: build (+ smoke in T14)
**Commit**: `feat(lookup): multi-select + range + grouped sort filters`

---

### T12: Inventory integration [P]

**What**: Wire Inventory filters to MultiSelect + Switch, and the column picker to the Checkbox primitive.
**Where**: `app/src/renderer/components/inventory/InventoryFilters.tsx`, `app/src/renderer/components/inventory/InventoryColumnPicker.tsx`, `app/src/renderer/tabs/Inventory.tsx`
**Depends on**: T1, T3, T7, T9
**Reuses**: `Switch` (existing); table sort stays as-is.
**Requirement**: FILT-03, FILT-10, FILT-11, FILT-13, FILT-14

**Tools**: Skill: `tbh-renderer` + `tbh-ux` + `design-system`

**Done when**:
- [ ] `MultiSelect` for grade/type/location; `Switch` for `tradableOnly`/`unequippedOnly`.
- [ ] `InventoryColumnPicker` native checkboxes → `Checkbox` primitive.
- [ ] Wrapped in `FilterBar`; top labels; stable "{n} shown".
- [ ] `Inventory.tsx` state → `string[]` / `LocationFilter[]`; **no** SortControl added (table sorts).
- [ ] Gate check passes: `pnpm run typecheck`

**Tests**: none (logic covered by T9) · **Gate**: build (+ smoke in T14)
**Commit**: `feat(inventory): multi-select filters, switches, themed column checkboxes`

---

### T13: Coin view (OfferingLoot) integration [P]

**What**: Wire the Offering Loot panel filters to MultiSelect + SortControl + FilterBar.
**Where**: `app/src/renderer/components/lookup/OfferingLoot.tsx`
**Depends on**: T1, T6, T7, T10
**Reuses**: existing loot list rendering.
**Requirement**: FILT-03, FILT-08, FILT-13, FILT-14

**Tools**: Skill: `tbh-renderer` + `tbh-ux` + `design-system`

**Done when**:
- [ ] `MultiSelect` for grade/type; `SortControl` replaces inline select+`▲▼`.
- [ ] Wrapped in `FilterBar`; top labels; stable "{n} shown".
- [ ] Local state → `string[]`; passes typecheck.
- [ ] Gate check passes: `pnpm run typecheck`

**Tests**: none (logic covered by T10) · **Gate**: build (+ smoke in T14)
**Commit**: `feat(lookup): multi-select + grouped sort for offering-loot (coin view)`

---

### T14: Capstone QA + dev smoke

**What**: Full quality gate and visual smoke across all three surfaces.
**Where**: whole `app/`
**Depends on**: T11, T12, T13
**Reuses**: `tbh-qa` skill workflow.
**Requirement**: all (verification)

**Tools**: Skill: `tbh-qa`

**Done when**:
- [ ] `pnpm run qa` passes (typecheck, lint, format, test, build, bundle guards).
- [ ] `pnpm run dev` (or `pnpm run qa:dev`): non-blank window; multi-select/clear, search, range slider persistence, switches, sort icons, styled scrollbars/checkboxes all verified on Inventory, Lookup, and Coin view.
- [ ] No leftover targetGroup dead code (grep clean).

**Tests**: full suite · **Gate**: full
**Commit**: (no code — or `chore: changelog/QA for filtering-sorting evolution` if changelog updated per tbh-changelog)

---

## P3 — Optional follow-ups (opt-in, not in the required path)

| ID | Task | Reuses |
|----|------|--------|
| T15 | Lookup "Tradable only" Switch via `LookupItem.marketTradable` | T8 predicate, Switch |
| T16 | Inventory value/price/count RangeSlider filters | T2 RangeSlider, T9 |
| T17 | Coin view drop-% RangeSlider over `poolPct` | T2 RangeSlider, T10 |

Each ships its own `lib/` unit test + top label if accepted. Otherwise logged as deferred in STATE.

---

## Pre-Approval Validation

### Check 1 — Granularity

| Task | Scope | Status |
|------|-------|--------|
| T1 MultiSelect | 1 primitive (dir) | ✅ |
| T2 RangeSlider | 1 primitive | ✅ |
| T3 Checkbox | 1 primitive | ✅ |
| T4 lucide dep | 1 config change | ✅ |
| T5 scrollbars | 1 file | ✅ |
| T6 SortControl | 1 composite | ✅ |
| T7 FilterBar | 1 composite | ✅ |
| T8 lookupFilters | 1 lib file + its test | ✅ |
| T9 inventoryFilters | 1 lib file + its test | ✅ |
| T10 offeringLootFilters | 1 lib file + new test | ✅ |
| T11 Lookup integration | 1 surface (filters + tab wiring, cohesive) | ✅ |
| T12 Inventory integration | 1 surface (filters + column picker + tab, cohesive) | ✅ |
| T13 Coin view integration | 1 file | ✅ |
| T14 QA capstone | verification | ✅ |

### Check 2 — Diagram ↔ Definition cross-check

| Task | Depends on (body) | Diagram arrows | Status |
|------|-------------------|----------------|--------|
| T1,T2,T3,T4,T5,T7,T8,T9,T10 | None | (Phase 1, no arrows in) | ✅ Match |
| T6 | T4 | T4→T6 | ✅ Match |
| T11 | T1,T2,T6,T7,T8 | →T11 | ✅ Match |
| T12 | T1,T3,T7,T9 | →T12 | ✅ Match |
| T13 | T1,T6,T7,T10 | →T13 | ✅ Match |
| T14 | T11,T12,T13 | →T14 | ✅ Match |

No `[P]` task depends on another `[P]` task in the same phase. ✅

### Check 3 — Test co-location

| Task | Layer | Matrix requires | Task says | Status |
|------|-------|-----------------|-----------|--------|
| T1,T2,T3 | primitive | unit | unit | ✅ |
| T6 | filters composite (behavioral) | unit | unit | ✅ |
| T8,T9,T10 | lib pure logic | unit | unit | ✅ |
| T4 | config | none | none | ✅ |
| T5 | css | none | none | ✅ |
| T7 | layout composite (presentational) | none | none | ✅ |
| T11,T12,T13 | tab/filter wiring | none (logic tested in T8–T10) | none | ✅ |
| T14 | verification | full suite | full | ✅ |

All checks pass — no ❌.
