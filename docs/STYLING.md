# TBH Companion — styling

The renderer uses **Tailwind CSS v4** with shared components under `app/src/renderer/components/ui/`. Legacy CSS in `styles.css` is limited to `@layer base` resets and Electron drag-region helpers.

## Migration status

| Phase | Scope | Status |
| ----- | ----- | ------ |
| 1 | Tailwind setup, primitives, Settings/Market/About | Done (PR #20) |
| 2 | Live, Chests, Inventory, chrome, overlays; trim legacy CSS | Done (PR #21) |
| 3 | `Card`, `ToolbarButton`, Badge variants, panel `Accordion`; agent docs | Done (PR #22) |
| 4 | Status color tokens; app chrome extraction; `Card` adoption in Live + box tracker | Done (PR #23) |
| 5 | `ideal` token; remove remaining inline hex in Button + box tracker | This branch |
| 6 | `DataList` for Live tables; Inventory table `Card` shell | This branch |
| 7 | `StatCard` on `Card`; migration complete | This branch |

Phases 5–7 on **`feat/tailwind-phase-5-7-finish`** — one PR to close the Tailwind migration.

## Stack

| Piece              | Location                                                                  |
| ------------------ | ------------------------------------------------------------------------- |
| Tailwind entry     | `@import "tailwindcss"` at top of `styles.css`                            |
| Design tokens      | `@theme { ... }` in `styles.css`                                          |
| Class merge helper | `app/src/renderer/lib/cn.ts`                                              |
| UI primitives      | `app/src/renderer/components/ui/`                                         |
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

Import from `components/ui/` — **Market `Button` sizing is the reference**.

| Component                  | Use                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------- |
| `Button`                   | `variant`: `default` \| `primary` \| `danger` \| `ghost` \| `success`; `size`: `default` \| `lg` \| `sm` |
| `Card`                     | Bordered panels; `padding`: `default` \| `compact` \| `none`; `as`: `div` \| `li`                      |
| `DataList`, `DataListRow`  | Striped read-only lists (Live heroes/history)                                                            |
| `Field`, `Input`, `Select` | Form controls                                                                                            |
| `NumberInput`, `NumberField` | Themed number inputs (no native spinners); `density`: `default` \| `compact`; `align`: `start` \| `center`; `NumberField` adds optional `label`, `footer`, `labelAlign` / `footerAlign` for compact config rows |
| `SelectField`              | Themed listbox dropdown (`bg-card`, `border-border`); `variant`: `default` \| `ideal`; optional `footer` slot for reset links without layout shift — not a native `<select>` popup |
| `Section`                  | Settings/About subsection headings                                                                       |
| `PanelSection`             | Live-style uppercase section labels                                                                      |
| `StatCard`                 | Metric tiles (Live totals, Inventory summary) — composes `Card`                                          |
| `Badge`                    | `full` (chest Full), `info` / `success` / `muted` (summary pills), `statusReady` / `statusCooldown`     |
| `CapacityBar`              | Chest capacity + box-tracker cooldown bars                                                               |
| `HintBanner`               | Gold-accent callouts (Inventory hints, pricing banner)                                                   |
| `LinkButton`               | Inline text links in stat labels                                                                         |
| `IconButton`               | Overlay chrome icon buttons; `edge`: `start` \| `end` for optical alignment at row edges (close, expand) |
| `ToolbarButton`            | Main-window toolbar (Mini, Stage chests)                                                                 |
| `OverlayFrame`             | Mini overlay + box tracker shell (`px-2.5 py-1.5`, `gap-1`)                                              |
| `Accordion`                | `variant`: `default` \| `panel` (Settings Advanced)                                                      |
| `TabHeader`, `TabPage`     | Tab chrome                                                                                               |
| `ProgressBar`              | Market/About download bars                                                                               |
| `AppTabBar`, `SaveStatusBar` | Main window chrome (extracted from `App.tsx`)                                                          |

## Layout rules

- Main window defaults to **1100×720** with **fixed width** (height resizable). Do **not** add tab-level `max-width` that fights horizontal growth.
- Form-heavy tabs: inner column `max-w-md` inside `TabPage`.
- Player-facing copy in tab intros; technical paths in Settings **Advanced**.

## Layout stability (avoid shift)

Conditional UI must **not** push surrounding content when it appears or disappears.

**Do:**

- Reserve space for optional actions (reset links, hints, errors) with a fixed `min-h-*` footer slot; hide extras with `invisible pointer-events-none` instead of conditional mount.
- Use `SelectField` for dropdowns — custom list uses app tokens (`bg-card`), not the native OS gray popup.
- Prefer toggling visibility/opacity over mounting new blocks below controls the user is interacting with.

**Don't:**

- Render reset/help links only when `isCustom` / `hasError` if that changes card or row height.
- Rely on the browser default select arrow (varies by platform and padding).
- Stack new badges or messages above/below a focused input without reserved space.

**Agent checklist:** Before shipping renderer UI, scan for `{condition && <…>}` near form controls; if removal would change layout, use a reserved slot or `invisible` placeholder.

## Adding new styles

1. Prefer `components/ui/*` + Tailwind utilities.
2. Use `cn()` when merging conditional classes.
3. Add shared patterns to `ui/` when used in 2+ places.
4. Add to `styles.css` only for Electron-specific behavior that Tailwind cannot express.
