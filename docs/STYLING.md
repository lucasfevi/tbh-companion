# TBH Companion — styling

The renderer uses **Tailwind CSS v4** with shared components under `app/src/renderer/components/ui/`. Legacy CSS in `styles.css` is limited to global body defaults and Electron drag-region helpers.

## Stack

| Piece              | Location                                                                  |
| ------------------ | ------------------------------------------------------------------------- |
| Tailwind entry     | `@import "tailwindcss"` at top of `styles.css`                            |
| Design tokens      | `@theme { ... }` in `styles.css`                                          |
| Class merge helper | `app/src/renderer/lib/cn.ts`                                              |
| UI primitives      | `app/src/renderer/components/ui/`                                         |
| Legacy CSS         | `styles.css` — body reset + `.overlay` / `.no-drag` / `.drag-handle` only |

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

## UI components

Import from `components/ui/` — **Market `Button` sizing is the reference**.

| Component                  | Use                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------- |
| `Button`                   | `variant`: `default` \| `primary` \| `danger` \| `ghost` \| `success`; `size`: `default` \| `lg` \| `sm` |
| `Field`, `Input`, `Select` | Form controls                                                                                            |
| `Section`                  | Settings/About subsection headings                                                                       |
| `PanelSection`             | Live-style uppercase section labels                                                                      |
| `StatCard`                 | Metric tiles (Live totals, Inventory summary)                                                            |
| `Badge`                    | Chest “Full” pill                                                                                        |
| `CapacityBar`              | Chest capacity + box-tracker cooldown bars                                                               |
| `HintBanner`               | Gold-accent callouts (Inventory hints, pricing banner)                                                   |
| `LinkButton`               | Inline text links in stat labels                                                                         |
| `IconButton`               | Overlay chrome icon buttons                                                                              |
| `Accordion`                | Settings Advanced                                                                                        |
| `TabHeader`, `TabPage`     | Tab chrome                                                                                               |
| `ProgressBar`              | Market/About download bars                                                                               |

## Layout rules

- Main window width is **900px fixed** (no horizontal resize). Do **not** add tab-level `max-width`.
- Form-heavy tabs: inner column `max-w-md` inside `TabPage`.
- Player-facing copy in tab intros; technical paths in Settings **Advanced**.

## Adding new styles

1. Prefer `components/ui/*` + Tailwind utilities.
2. Use `cn()` when merging conditional classes.
3. Add shared patterns to `ui/` when used in 2+ places.
4. Add to `styles.css` only for Electron-specific behavior that Tailwind cannot express.
