# Filtering & Sorting Refinements Specification

## Problem Statement

The newly-shipped multi-select filters work, but the layout and copy need
polish: counts and search labels are inconsistent, toggles use switches instead
of the themed checkbox, long option lists (modifiers, gear types) aren't grouped,
and Lookup shows irrelevant filters for the selected item type. The Coin view
carries filters it doesn't need. Two small bugs (MultiSelect top padding, stale
Storybook checkboxes) remain.

## Goals

- [ ] Consistent filter chrome across Inventory, Lookup, Coin view (count beside
      search reading "{n} items", no search label, checkboxes for toggles).
- [ ] Lookup adapts its visible filters to the selected item type (none / gear /
      material) and groups Modifier + Gear type options.
- [ ] Coin view reduced to a search box; always sorted by drop % desc.
- [ ] Sort restyled as a glued segmented control, placed before search.
- [ ] Two bugs fixed (MultiSelect top space, Storybook old checkboxes).

## Out of Scope

| Feature | Reason |
| --- | --- |
| Filter/sort performance + virtualization | Separate feature `lookup-filter-performance` (user decision R8). |
| Saved filter presets / persistence | Still out of scope (session-only state unchanged). |
| New filter fields beyond current set | Not requested in this pass. |

---

## User Stories

### P1: Consistent filter chrome ⭐ MVP

**User Story**: As a user, I want every filter surface to present its search,
count, and toggles the same way so the app feels coherent.

**Acceptance Criteria**:

1. WHEN any filter surface renders THEN the item count SHALL sit beside the
   search input and read "{n} items" (not "{n} shown").
2. WHEN the search input renders THEN it SHALL have no field label above it.
3. WHEN a boolean toggle filter renders (Lookup Unique only; Inventory Tradable
   only, Unequipped only) THEN it SHALL use the Checkbox primitive, not Switch.

**Independent Test**: Open each tab; counts read "{n} items" next to search, no
label, toggles are checkboxes.

---

### P1: Lookup adaptive setups + grouping ⭐ MVP

**User Story**: As a user, I want Lookup to show only the filters relevant to the
item type I'm viewing, with grouped Modifier and Gear type lists.

**Acceptance Criteria**:

1. WHEN no item type is selected THEN Lookup SHALL show Item type, Grade,
   Modifier, Gear type, Material kind, Level, Unique only.
2. WHEN only Gear is selected THEN Lookup SHALL show Item type, Grade, Modifier,
   Gear type, Level, Unique only (no Material kind).
3. WHEN only Material is selected THEN Lookup SHALL show Item type, Grade,
   Modifier, Material kind (no Gear type, Level, Unique only).
4. WHEN the Item type filter renders THEN it SHALL be two checkboxes (Gear,
   Material), not a dropdown.
5. WHEN the Gear type list opens THEN options SHALL be grouped Weapon / Armor /
   Accessory (derived from each item's gearGroup).
6. WHEN the Modifier list opens THEN options SHALL be grouped Offense / Defense /
   Util / Skill per the authored mapping (context.md R1); unmapped keys fall in
   an "Other" group.
7. WHEN Lookup renders THEN the "Effect" label SHALL read "Modifier" and the
   "Gear slot" label SHALL read "Gear type".
8. WHEN Lookup renders THEN the Class filter SHALL NOT appear.
9. WHEN switching item type away from gear/material THEN level range SHALL
   persist (unchanged behavior) and now-hidden sub-filters SHALL clear.

**Independent Test**: Toggle Gear/Material checkboxes; verify the visible filter
set per setup; open Modifier and Gear type to see group labels.

---

### P1: Coin view = search only ⭐ MVP

**User Story**: As a user, I want the Offering Loot panel to just let me search,
since it's a small fixed list.

**Acceptance Criteria**:

1. WHEN the Coin view renders THEN it SHALL show only a search input + "{n}
   items" count.
2. WHEN the Coin view lists loot THEN it SHALL always sort by drop % descending.
3. WHEN the Coin view renders THEN grade/type MultiSelects and the SortControl
   SHALL NOT appear.

**Independent Test**: Open a coin's Offering Loot; only search + count; rows
ordered by drop % desc; searching narrows rows.

---

### P2: Inventory repositioning + renames

**User Story**: As a user, I want the Inventory filters arranged per the mock
with clearer labels.

**Acceptance Criteria**:

1. WHEN Inventory renders THEN filters SHALL be arranged: top row Grade, Item
   type, Location; bottom row Search + count + Unequipped only + Tradable only +
   Edit columns.
2. WHEN the type filter label renders THEN it SHALL read "Item type".
3. WHEN the column picker button renders THEN it SHALL read "Edit columns".

**Independent Test**: Open Inventory; layout matches mock; labels updated.

---

### P2: Sort as glued segmented control

**User Story**: As a user, I want the Lookup sort control to read as one cohesive
segmented control placed before the search input.

**Acceptance Criteria**:

1. WHEN Lookup renders THEN the sort control SHALL appear before the search input.
2. WHEN the sort control renders THEN the sort-key control and direction toggle
   SHALL be visually glued (shared borders, equal height, no gap).

**Independent Test**: Lookup sort sits left of search and reads as one segmented
unit; direction toggle still flips asc/desc.

---

### P2: Bug fixes

**Acceptance Criteria**:

1. WHEN a MultiSelect popup opens THEN there SHALL be no extra empty space above
   the first option (search-off case especially).
2. WHEN Storybook renders Popover/Field stories THEN they SHALL use the Checkbox
   primitive, not native `input type="checkbox"`.

---

## Edge Cases

- WHEN both Gear and Material are checked in Lookup THEN the union setup SHALL
  show (same as none selected), and a persisted Level band SHALL remain
  material-safe (level-less items still pass).
- WHEN a stat key is not in the Modifier map THEN it SHALL appear under "Other".
- WHEN the loot/list is empty after filtering THEN the count SHALL read "0 items"
  and the existing empty message SHALL show.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| REFN-01 count beside search "{n} items" | P1 chrome | Tasks | Pending |
| REFN-02 remove search label | P1 chrome | Tasks | Pending |
| REFN-03 checkboxes for toggles | P1 chrome | Tasks | Pending |
| REFN-04 Coin view search-only + fixed sort | P1 coin | Tasks | Pending |
| REFN-05 Inventory layout per mock | P2 inv | Tasks | Pending |
| REFN-06 Inventory renames (Item type, Edit columns) | P2 inv | Tasks | Pending |
| REFN-07 Lookup Item type checkboxes | P1 lookup | Tasks | Pending |
| REFN-08 Lookup adaptive setups | P1 lookup | Tasks | Pending |
| REFN-09 Lookup renames (Modifier, Gear type) | P1 lookup | Tasks | Pending |
| REFN-10 remove Class filter | P1 lookup | Tasks | Pending |
| REFN-11 sort segmented + before search | P2 sort | Tasks | Pending |
| REFN-12 Gear type grouping (data-derived) | P1 lookup | Tasks | Pending |
| REFN-13 Modifier grouping (authored) | P1 lookup | Tasks | Pending |
| REFN-14 MultiSelect top-space bug | P2 bugs | Tasks | Pending |
| REFN-15 Storybook checkbox stories | P2 bugs | Tasks | Pending |

**Coverage:** 15 total, all mapped in tasks.md.

---

## Success Criteria

- [ ] All three surfaces match the attached mocks.
- [ ] `pnpm run qa` + `pnpm run qa:dev` green.
- [ ] Modifier/Gear type groups render with labels; no orphaned options.
- [ ] No Switch remains in filter UI; no native checkbox remains in stories.
