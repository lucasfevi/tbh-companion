# TBH Companion — styling

The renderer uses **Tailwind CSS v4**. Components live under `app/src/renderer/design-system/primitives/` — see the **design-system** skill, not this doc, for the component lookup table and usage patterns. Legacy CSS in `styles.css` is limited to `@layer base` resets and Electron drag-region helpers.

## Migration status

| Phase | Scope | Status |
| ----- | ----- | ------ |
| 1 | Tailwind setup, primitives, Settings/Market/About | Done (PR #20) |
| 2 | Live, Chests, Inventory, chrome, overlays; trim legacy CSS | Done (PR #21) |
| 3 | `Card`, `ToolbarButton`, Badge variants, panel `Accordion`; agent docs | Done (PR #22) |
| 4 | Status color tokens; app chrome extraction; `Card` adoption in Live + box tracker | Done (PR #23) |
| 5 | `ideal` token; remove remaining inline hex in Button + box tracker | Done |
| 6 | `DataList` for Live tables; Inventory table `Card` shell | Done |
| 7 | `StatCard` on `Card`; migration complete | Done |
| 8 | Design system (Base UI + Storybook) migration — `components/ui/` ported to `design-system/primitives/` behind Base UI where it adds real a11y value (focus trap, keyboard nav, portal positioning); see the **design-system** skill | Done (PRs #68–#75, plus this PR) |

## Stack

| Piece              | Location                                                                  |
| ------------------ | ------------------------------------------------------------------------- |
| Tailwind entry     | `@import "tailwindcss"` at top of `styles.css`                            |
| Design tokens      | `@theme { ... }` in `styles.css`                                          |
| Class merge helper | `app/src/renderer/lib/cn.ts`                                              |
| UI primitives      | `app/src/renderer/design-system/primitives/` (see **design-system** skill) |
| Legacy CSS         | `styles.css` — base layer + `.overlay` / `.no-drag` / `.drag-handle` only |

## Design tokens

| Token          | Tailwind                          |
| -------------- | --------------------------------- |
| Background     | `bg-bg`                           |
| Panel / card   | `bg-panel`, `bg-card`             |
| Border         | `border-border`                   |
| Text           | `text-fg`, `text-muted`           |
| Primary action | `bg-accent`, `text-accent-fg`     |
| Danger         | `border-danger`, `text-danger-fg` |
| Warning / XP   | `text-gold`                       |
| Status info    | `text-status-info`, `border-status-info-border` |
| Status success | `text-status-success`, `border-status-success-border` |
| Status danger  | `bg-status-danger`                |
| Ideal stage    | `text-ideal`, `bg-ideal/15`, `shadow-ideal/25` (box tracker) |

Status accents for box tracker and chest badges use `@theme` tokens above — do not invent new hex colors in tabs.

## UI components

See `docs/agent/layers/DESIGN-SYSTEM.md` for the component lookup table, or browse `npm run storybook` for live examples — each primitive's `.stories.tsx` is the canonical usage reference, kept in sync with the component by `test:dom` + `jest-axe`. Don't duplicate prop tables here; they drift.

## Layout rules

- Main window defaults to **1100×720** with **fixed width** (height resizable). Do **not** add tab-level `max-width` that fights horizontal growth.
- Form-heavy tabs: inner column `max-w-md` inside `TabPage`.
- Player-facing copy in tab intros; technical paths in Settings **Advanced**.

## Layout stability (avoid shift)

Conditional UI must **not** push surrounding content when it appears or disappears.

**Do:**

- Reserve space for optional actions (reset links, hints, errors) with a fixed `min-h-*` footer slot; hide extras with `invisible pointer-events-none` instead of conditional mount.
- Use `Select` for dropdowns — custom popup uses app tokens (`bg-card`), not the native OS gray popup.
- Prefer toggling visibility/opacity over mounting new blocks below controls the user is interacting with.

**Don't:**

- Render reset/help links only when `isCustom` / `hasError` if that changes card or row height.
- Rely on the browser default select arrow (varies by platform and padding).
- Stack new badges or messages above/below a focused input without reserved space.

**Agent checklist:** Before shipping renderer UI, scan for `{condition && <…>}` near form controls; if removal would change layout, use a reserved slot or `invisible` placeholder.

## Adding new styles

1. Prefer `design-system/primitives/*` + Tailwind utilities (see the **design-system** skill).
2. Use `cn()` when merging conditional classes.
3. Add a new primitive when a pattern is used in 2+ places.
4. Add to `styles.css` only for Electron-specific behavior that Tailwind cannot express.
