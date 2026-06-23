# Filtering & Sorting Evolution — Captured Decisions

Gray-area decisions confirmed with the user during Specify. These are binding for
Design/Tasks/Execute unless explicitly revisited.

| # | Question | Decision | Implication |
|---|----------|----------|-------------|
| D1 | What is the "Coin view"? | **The Offering Loot panel** (`app/src/renderer/components/lookup/OfferingLoot.tsx`) — the Cube "coin" loot table with its own search/grade/type/sort bar. | Filter + sort changes apply here in addition to Inventory and Lookup. |
| D2 | Icons for sort direction (asc/desc)? | **Use Lucide glyphs via the already-installed `react-icons/lu`** (revised — `app/` already depends on `react-icons` 5.6.0, so a separate `lucide-react` package is redundant; confirmed with user after discovering the existing dep). | Import `LuArrowUpNarrowWide` / `LuArrowDownNarrowWide` (and `LuCheck`/`LuX` for MultiSelect) from `react-icons/lu`. **No new dependency.** Replaces text `▲▼`. T4 is therefore a no-op (verified, not a code change). |
| D3 | Persist filter selections across restarts? | **No — reset each session.** | Filters stay in component state. No `config.json` / IPC / preload changes. Keeps scope in renderer + design-system. |
| D4 | The confusing material "Applies to anything" filter (`targetGroupFilter`, values WEAPON/ARMOR/ACCESSORY/COMMON)? | **Remove it entirely.** | Delete the targetGroup Select, its props, the `targetGroupFilter` state, the `targetGroupOptionsFromItems` helper, and the targetGroup branch in `filterAndSortItems`. Rely on effect + material-kind filters. "Common" confusion goes away with the control. |
| D5 | RangeSlider bounds & state behavior | **Fixed range 1–100** (the game level cap), **not** derived from the currently-filtered items; the range **persists** across other filter changes (don't reset/clamp when the results list changes). | Bounds are constants (`LEVEL_MIN=1`, `LEVEL_MAX=100`), not `levelOptionsFromItems`. `levelRange` state is independent — never cleared by `handleTypeFilterChange`. Level predicate is **material-safe** (items without a level pass through) so a persisted band doesn't wrongly hide materials when GEAR+MATERIAL are both selected. `levelOptionsFromItems` becomes unused → remove. |

## Key codebase facts (verified)

- **Three filter surfaces**, all in the renderer:
  - Inventory — `components/inventory/InventoryFilters.tsx`; **sorting is handled by the
    data table** (`InventoryTable.tsx`), so the sort-control redesign does NOT apply here.
  - Lookup — `components/lookup/LookupFilters.tsx`; card grid; sort = Select + dir button.
  - Coin view (Offering Loot) — `components/lookup/OfferingLoot.tsx`; data list; sort =
    Select + dir button.
- **`Select` primitive** (`design-system/primitives/Select/Select.tsx`) is single-value
  only — no multi-select, no search, no option groups. Built on `@base-ui/react/select`.
- **`Switch` primitive** exists (`design-system/primitives/Switch/Switch.tsx`) but is
  currently **unused** — ready to adopt for toggle filters.
- **No RangeSlider primitive** exists. No icon library. No shared scrollbar or checkbox
  styling — toggles are raw `<input type="checkbox">` inside `Field checkbox`.
- **Filter logic** is pure and unit-testable: `lib/lookupFilters.ts`,
  `lib/inventoryFilters.ts`, `lib/offeringLootFilters.ts`. Multi-select changes the
  `*Filter: string` fields to `string[]` and the equality checks to membership checks.
- **`targetGroup`/"COMMON"**: a material's `gearGroups[].gearGroup` ∈
  {WEAPON, ARMOR, ACCESSORY, COMMON}; COMMON = effect applies to any slot. Being removed (D4).
- **Theme tokens** live in `styles.css` `@theme` (Tailwind v4). Scrollbar/checkbox styling
  should use these tokens (`--color-border`, `--color-muted`, `--color-accent`, etc.).
- **Candidate new filter data** available but unused today: `LookupItem.marketTradable`
  (Lookup "tradable only"), inventory `value`/`unitPrice`/`count` ranges, `level` range.
