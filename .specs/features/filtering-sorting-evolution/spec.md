# Filtering & Sorting Evolution Specification

## Problem Statement

TBH Companion's filter controls are single-select only, so users can't ask for
"Immortal **and** Arcana gear" or "decoration **and** engraving materials" at once.
Long option lists (e.g. material effects) are hard to scan with no search. Controls
lack labels, use unstyled native checkboxes and scrollbars, split min/max level into
two selects, and the material "Applies to anything" filter is confusing. These rough
edges live across three surfaces — Inventory, Lookup, and the Coin view (Offering Loot).

## Goals

- [ ] Multi-select with visible selected-state, a search box, option grouping, and a clear
      action — available on every relevant filter across all three surfaces.
- [ ] A single labelled level **range slider** replacing the two min/max level selects.
- [ ] Consistent, on-brand styling for scrollbars and checkboxes app-wide; toggle filters
      use the `Switch` primitive.
- [ ] A grouped sort control (Select + direction toggle with asc/desc icons) on Lookup and
      Coin view only (Inventory sorts via its data table).
- [ ] Clearer layout: top-positioned filter labels, a stable "{n} shown" counter on Lookup,
      and the confusing targetGroup filter removed.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Persisting filter selections across app restarts | D3 — session-only state; avoids config/IPC scope. |
| Changing Inventory's sort control | Inventory sorts via its data-table headers, not a sort Select. Only multi-select/labels/switch/checkbox/scrollbar apply there. |
| New IPC channels, main/preload, or `config.json` changes | Pure renderer + design-system + global CSS work. |
| Saved filter "presets" / named views | Not requested; future idea (logged to STATE). |
| Revamping the targetGroup/"Common" filter into the effect filter | D4 chose outright removal, not a merge. |

---

## User Stories

### P1: Multi-select filter primitive ⭐ MVP

**User Story**: As a player, I want to pick several values in one filter (e.g. Immortal
and Arcana grades) so that I can compare related items without re-filtering one at a time.

**Why P1**: The headline pain. Every other story builds on or composes with the upgraded
Select. Without it the feature has no value.

**Acceptance Criteria**:

1. WHEN a filter is configured as multi-select THEN the Select SHALL allow selecting and
   deselecting multiple options, each showing a checked/unchecked indicator.
2. WHEN one or more options are selected THEN the trigger SHALL summarize the selection
   (e.g. "2 grades" or the single label) and SHALL offer a clear/reset affordance.
3. WHEN the selection is cleared THEN the filter SHALL behave as "no filter" (show all),
   matching today's `ALL` behavior.
4. WHEN multiple values are selected THEN the result set SHALL include any item matching
   **any** selected value (OR within a filter), while distinct filters remain ANDed.
5. WHEN the existing single-select call sites are unchanged THEN they SHALL continue to
   work (multi is opt-in; no regression to single-value Selects).

**Independent Test**: On Lookup, select Immortal + Arcana grades and confirm both grades'
items appear; clear and confirm all grades return.

---

### P1: Multi-select across all three surfaces ⭐ MVP

**User Story**: As a player, I want multi-select on the filters that benefit from it on
Inventory, Lookup, and the Coin view so the capability is consistent everywhere.

**Why P1**: A multi-select primitive nobody can use is worthless; the vertical slice
includes wiring real filters.

**Acceptance Criteria**:

1. WHEN on Lookup THEN type, grade, effect, gear slot, class, and material-kind filters
   SHALL support multi-select.
2. WHEN on Inventory THEN grade, type, and location filters SHALL support multi-select.
3. WHEN on the Coin view (Offering Loot) THEN grade and type filters SHALL support
   multi-select.
4. WHEN a multi-select filter's underlying state changes from a single string to a set
   THEN the pure filter functions (`filterAndSortItems`, `filterAndSortRows`,
   `filterAndSortLoot`) SHALL be updated with passing Vitest coverage for the OR semantics.
5. WHEN the Lookup type multi-select includes both GEAR and MATERIAL THEN gear-only and
   material-only sub-filters SHALL behave sensibly (resolved in Design — e.g. show both
   groups; clearing rules preserved).

**Independent Test**: On each surface, multi-select two values and confirm the union shows;
unit tests assert OR-within / AND-across semantics.

---

### P1: Searchable + groupable Select ⭐ MVP

**User Story**: As a player, I want to type to filter a long option list (material effects)
and see options organized into labelled groups so I can find what I need quickly.

**Why P1**: Material effects is the explicitly-cited unusable list; search is core to the
"evolve the Select" ask.

**Acceptance Criteria**:

1. WHEN a Select is marked searchable THEN it SHALL render a search input that filters the
   visible options by label as the user types.
2. WHEN no option matches the search THEN the Select SHALL show an empty-state message.
3. WHEN options declare a group THEN the Select SHALL render a non-selectable group label
   above each group's options.
4. WHEN searching within a grouped Select THEN group labels with no matching options SHALL
   be hidden.
5. WHEN the effect filter is rendered on Lookup THEN it SHALL be searchable.

**Independent Test**: Open the effect filter, type a stat name, confirm the list narrows and
empty-state shows for nonsense input.

---

### P1: Level range slider ⭐ MVP

**User Story**: As a player, I want one labelled min–max level range control instead of two
separate selects so setting a level band is fast and obvious.

**Why P1**: Directly requested, user-facing, and needs a new primitive (RangeSlider) that
other future filters (price/value ranges) can reuse.

**Acceptance Criteria**:

1. WHEN the Lookup level filter renders THEN it SHALL be a single dual-thumb range slider
   over a **fixed 1–100 scale** (the game level cap — `LEVEL_MIN`/`LEVEL_MAX` constants, **not**
   derived from the currently-filtered items), with a label and the current range shown.
2. WHEN the user drags either thumb THEN the result set SHALL update to items whose level is
   within `[lo, hi]` inclusive; items without a level (materials) SHALL pass the level check.
3. WHEN the range spans the full bounds `[1, 100]` THEN the filter SHALL be treated as "no
   level filter".
4. WHEN other filters change the results list THEN the slider's range SHALL **persist
   unchanged** — it is never reset or clamped to the visible items.
5. WHEN the type multi-select excludes GEAR THEN the gear-only sub-filters MAY hide, but the
   level range state SHALL persist so re-selecting GEAR restores the prior band.
6. WHEN the RangeSlider primitive is added THEN it SHALL have Storybook + Vitest coverage
   per the design-system conventions.

**Independent Test**: Drag the slider to Lv 10–20 and confirm only in-band gear shows; widen
to full and confirm the filter clears.

---

### P2: Grouped sort control with direction icons

**User Story**: As a player, I want sort presented as one tidy control — a "sort by" select
next to a direction toggle with clear up/down icons — on Lookup and the Coin view.

**Why P2**: Real polish and uses the new icon library, but the existing select + `▲▼`
button already works; not blocking.

**Acceptance Criteria**:

1. WHEN the sort control renders on Lookup or the Coin view THEN it SHALL group a "Sort by"
   Select with a direction toggle button as one labelled unit.
2. WHEN the direction toggle shows ascending vs descending THEN it SHALL use `lucide-react`
   asc/desc icons (D2) instead of the text `▲`/`▼` glyphs.
3. WHEN sorting is on Inventory THEN this control SHALL NOT appear (Inventory sorts via the
   data table) — only multi-select/labels/switch/checkbox/scrollbar changes reach Inventory.
4. WHEN the user toggles direction THEN the displayed icon and the sort order SHALL update
   together.

**Independent Test**: On Coin view, toggle direction and confirm the icon flips and rows
reverse; confirm Inventory has no such control.

---

### P2: Switches, styled checkboxes, styled scrollbars, and filter labels

**User Story**: As a player, I want toggle filters to be switches, checkboxes and scrollbars
to match the app's look, and every filter to carry a label so the controls read clearly.

**Why P2**: Consistency and clarity; visible quality bar but not functional gating.

**Acceptance Criteria**:

1. WHEN a boolean toggle filter renders (Inventory "Tradable only" / "Unequipped only";
   Lookup "Unique only") THEN it SHALL use the `Switch` primitive instead of a native
   checkbox.
2. WHEN any checkbox remains in the app (e.g. multi-select option indicators, column picker)
   THEN it SHALL use shared on-brand styling driven by theme tokens.
3. WHEN any scrollable region renders (popups, lists, panels) THEN its scrollbar SHALL use a
   consistent app-themed style.
4. WHEN any filter control renders THEN it SHALL have a descriptive label positioned at the
   top of the control.

**Independent Test**: Visually verify switches/checkboxes/scrollbars match tokens in dev;
confirm every filter shows a top label.

---

### P2: Layout reorganization (tbh-ux)

**User Story**: As a player, I want the filters laid out coherently and the Lookup "{n}
shown" counter positioned so it isn't pushed around by other filters.

**Why P2**: Composition of the above; needs the tbh-ux skill to plan placement.

**Acceptance Criteria**:

1. WHEN filters are arranged on each surface THEN the layout SHALL follow a tbh-ux-reviewed
   plan (grouping, wrap behavior, label placement) consistent across surfaces.
2. WHEN the Lookup result count renders THEN "{n} shown" SHALL occupy a stable position
   independent of how many filters are active/visible.
3. WHEN filters wrap on narrow widths THEN labels and controls SHALL remain aligned and
   readable.

**Independent Test**: Resize the Lookup window and confirm the count stays put and labels
stay aligned.

---

### P3: Additional suggested filters

**User Story**: As a player, I want a few high-value filters the data already supports so I
can slice items more precisely.

**Why P3**: Net-new scope beyond the request; propose and let the user opt in per item.

**Candidate filters (data-backed, to confirm in Design):**

1. WHEN on Lookup THEN a "Tradable only" toggle MAY filter by `LookupItem.marketTradable`.
2. WHEN on Inventory THEN a value/price **range** filter MAY use the new RangeSlider over
   `value`/`unitPrice`.
3. WHEN on Inventory THEN a quantity (`count`) range filter MAY be offered.
4. WHEN on the Coin view THEN a drop-% range filter MAY use the RangeSlider over `poolPct`.

**Acceptance Criteria**: Each accepted candidate ships with its pure-filter unit test and a
top label; rejected ones are logged to STATE as deferred ideas.

---

## Edge Cases

- WHEN a multi-select has every option selected THEN it SHALL be equivalent to none selected
  (no filtering) to avoid an accidental "select all = empty if a new value appears" trap.
- WHEN a level band is active and the type filter shows materials (level-less) THEN those
  materials SHALL still appear (the level predicate is material-safe) and the band SHALL persist.
- WHEN a searchable Select's options change while a search string is active THEN the filtered
  view SHALL recompute without losing the search text.
- WHEN switching the Lookup type multi-select such that previously-relevant **multi-select**
  sub-filters hide (gearType, class, material-kind) THEN their selections SHALL be cleared
  (preserve today's "don't silently keep filtering" behavior in `handleTypeFilterChange`) —
  **except the level range, which persists** (D5).
- WHEN multi-select state is empty THEN summarizing the trigger SHALL show the "all" label,
  not a blank/zero state.
- WHEN `lucide-react`'s build/postinstall is skipped by pnpm THEN it SHALL be allow-listed
  per AGENTS.md (Windows/pnpm `allowBuilds`) so the icons resolve.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| FILT-01 | P1: Multi-select primitive | Design | Pending |
| FILT-02 | P1: Multi-select primitive (clear/summary) | Design | Pending |
| FILT-03 | P1: Multi-select across surfaces (OR/AND semantics + tests) | Design | Pending |
| FILT-04 | P1: Searchable Select | Design | Pending |
| FILT-05 | P1: Groupable Select (group labels) | Design | Pending |
| FILT-06 | P1: Level RangeSlider primitive | Design | Pending |
| FILT-07 | P1: RangeSlider wired to Lookup level | Design | Pending |
| FILT-08 | P2: Grouped sort control (Lookup + Coin view) | Design | Pending |
| FILT-09 | P2: lucide-react asc/desc icons | Design | Pending |
| FILT-10 | P2: Switch adoption for toggle filters | Design | Pending |
| FILT-11 | P2: Shared styled checkboxes | Design | Pending |
| FILT-12 | P2: Global styled scrollbars | Design | Pending |
| FILT-13 | P2: Top-positioned filter labels | Design | Pending |
| FILT-14 | P2: Layout reorg (tbh-ux) + stable "{n} shown" | Design | Pending |
| FILT-15 | D4: Remove targetGroup / "Applies to anything" filter | Design | Pending |
| FILT-16 | P3: Additional suggested filters (opt-in) | - | Pending |

**ID format:** `FILT-[NUMBER]`
**Status values:** Pending → In Design → In Tasks → Implementing → Verified
**Coverage:** 16 total, 0 mapped to tasks, 16 unmapped ⚠️ (Tasks phase pending)

---

## Success Criteria

- [ ] A user can select multiple grades/types/effects on every relevant filter on all three
      surfaces, with clear selected-state and a one-click clear.
- [ ] The material-effects list is searchable and finds an effect in < 3 seconds of typing.
- [ ] Level filtering is one range slider; setting a band takes one drag, no second control.
- [ ] Switches, checkboxes, and scrollbars visually match the app theme tokens everywhere.
- [ ] Lookup and Coin view share one grouped sort control with asc/desc icons; Inventory's
      table sorting is untouched.
- [ ] The targetGroup/"Applies to anything" filter is gone with no dead code left behind.
- [ ] `pnpm run qa` passes (typecheck, lint, format, tests, build) and dev smoke shows a
      non-blank window with the new controls.
