# Tasks — filtering-sorting-refinements

Atomic, verifiable tasks. Gate = `pnpm run typecheck` + relevant `pnpm test`
green; full `pnpm run qa` + `qa:dev` at the end (T13).

## Phase 1 — pure helpers (no UI)

### T1 — Modifier + gear-type grouping helpers, drop Class [REFN-12, REFN-13, REFN-10]
- **Where**: `app/src/renderer/lib/lookupFilters.ts` (+ test).
- **Do**: add `MODIFIER_GROUP` map (context.md R1), `effectGroupsFromItems`,
  `LookupEffectGroup`, `gearTypeGroupsFromItems`, `LookupGearTypeGroup`. Remove
  `classFilter` from `LookupFilterState` + predicate; remove
  `classOptionsFromItems` and the `classForGearType`/`LOOKUP_CLASS_ORDER` import.
- **Done when**: groups returned in fixed order, empty groups omitted, options
  sorted by label, unmapped stat keys land in "Other"; predicate no longer reads
  classFilter.
- **Tests**: `app/test/renderer/lookupFilters.test.ts` — grouping order/content,
  "Other" bucket, gear groups from gearGroup, remove class tests.

## Phase 2 — primitives & shared controls

### T2 — MultiSelect top-padding fix [REFN-14]
- **Where**: `MultiSelect.tsx`.
- **Done when**: no doubled top inset; search input / first group label / first
  item sits flush at a single inset across Default/NotSearchable/Grouped stories.
- **Tests**: existing `MultiSelect.test.tsx` still green (structural only).

### T3 — SortControl glued segmented + inline label [REFN-11]
- **Where**: `SortControl.tsx` (+ `SortControl.test.tsx`); read `Select.tsx`
  first to confirm className override of border/rounding.
- **Done when**: inline "Sort by" label; Select + direction button share one
  rounded border, equal height, no gap; asc/desc icons + aria-labels intact.
- **Tests**: SortControl.test.tsx — icon per direction, toggle handler, axe.

### T4 — FilterBar: drop count slot [REFN-01]
- **Where**: `FilterBar.tsx`.
- **Done when**: `count` prop removed; component is a wrapping flex container; no
  caller references `count` (updated in T5–T7).

## Phase 3 — surfaces

### T5 — Coin view search-only [REFN-04, REFN-01, REFN-02]
- **Where**: `OfferingLoot.tsx`.
- **Do**: remove grade/type MultiSelects + SortControl + their state; keep search
  + inline "{n} items" count; pass fixed `{ gradeFilter: [], typeFilter: [],
  sortKey: "dropPct", sortDir: "desc" }` to `filterAndSortLoot`; drop the search
  Field label.
- **Done when**: only search + count render; rows always drop% desc.

### T6 — Inventory reposition + renames + checkboxes [REFN-05, REFN-06, REFN-03, REFN-01, REFN-02]
- **Where**: `InventoryFilters.tsx`, `Inventory.tsx`, `InventoryColumnPicker.tsx`.
- **Do**: top row Grade / Item type / Location; search row Input + count +
  Unequipped only (Checkbox) + Tradable only (Checkbox) + right-aligned
  `columnPicker` slot. Rename type label → "Item type", button "Columns" →
  "Edit columns". Inventory.tsx passes `<InventoryColumnPicker>` via the slot and
  drops the separate wrapper. Remove search Field label + Switch import.
- **Done when**: layout matches mock; toggles are checkboxes; labels updated.

### T7 — Lookup adaptive setups, checkboxes, grouped, sort-before-search [REFN-07, REFN-08, REFN-09, REFN-03, REFN-01, REFN-02, REFN-12, REFN-13]
- **Where**: `LookupFilters.tsx`, `Lookup.tsx`.
- **Do**: Item type = two Checkboxes; setups per context.md R3; rename Effect →
  Modifier, Gear slot → Gear type; pass grouped options
  (`effectGroupsFromItems`, `gearTypeGroupsFromItems`); Unique only = Checkbox;
  SortControl before search; inline "{n} items" count; drop search Field label;
  remove Class filter + props. Lookup.tsx: drop classFilter state + props, swap
  option props to grouped helpers, keep level-persist behavior.
- **Done when**: each setup shows the right controls; groups render with labels.

## Phase 4 — stories & QA

### T8 — Storybook old checkboxes [REFN-15]
- **Where**: `Popover.stories.tsx`, `Field.stories.tsx`.
- **Done when**: both use the `Checkbox` primitive; Storybook builds.

### T9 — Final QA gate
- `pnpm run qa` (typecheck + lint + format + test + build + bundle guards) green;
  `pnpm run qa:dev` green. Confirm mocks visually in dev.

## Test coverage matrix

| Task | Test file | New/updated |
| --- | --- | --- |
| T1 | lookupFilters.test.ts | updated (grouping, Other, no class) |
| T2 | MultiSelect.test.tsx | unchanged (still green) |
| T3 | SortControl.test.tsx | updated (segmented markup) |
| T5 | offeringLootFilters.test.ts | unchanged (lib general) |
| T6 | inventoryFilters.test.ts | unchanged (logic same) |
| T7 | lookupFilters.test.ts | covered by T1 |

## Validation checks (pre-execution)

- ✅ Granularity: each task ≤ ~2 files of real change + its test.
- ✅ Diagram ↔ tasks: every node in design.md maps to a task.
- ✅ Test co-location: pure-logic changes (T1) carry test updates; UI tasks rely
  on existing component tests + dev smoke.

## Execution notes / deviations

- **T4**: FilterBar became fully orphaned (all three surfaces moved the count
  inline beside search and adopted bespoke layouts), so it was **deleted**
  rather than just having its `count` slot removed.
- **T3**: added a `triggerClassName` escape hatch to the `Select` primitive so
  the segmented SortControl can strip the trigger's own border/rounding.
- **T7**: memoized the Lookup option/group derivations (`useMemo`) — they were
  previously rebuilt inline in JSX on every render; a cheap win that also nudges
  the deferred perf work.
- **T2 root cause**: `Combobox.Empty` (Base UI) always stays in the DOM for
  screen-reader live-region announcements; its wrapper div had `px-2.5 py-2`
  which took space even when children were null (items present). Fix: moved
  padding inside a `<span>` child so it only occupies space when "No matches."
  is actually rendered.

**Status**: All committed (T1–T9 + docs). `pnpm run qa` + `qa:dev` green.
