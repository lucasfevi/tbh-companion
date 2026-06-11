# TBH Companion — styling

The renderer uses **Tailwind CSS v4** for new UI plus a **legacy CSS block** in
`app/src/renderer/styles.css` for Inventory tables, Live rate cards, Chests grid,
overlays, and chrome until those areas migrate.

## Stack

| Piece | Location |
|-------|----------|
| Tailwind entry | `@import "tailwindcss"` at top of `styles.css` |
| Design tokens | `@theme { ... }` in `styles.css` (mirrors `:root` vars) |
| Class merge helper | `app/src/renderer/lib/cn.ts` (`clsx` + `tailwind-merge`) |
| UI primitives | `app/src/renderer/components/ui/` |
| Legacy layout/CSS | remainder of `styles.css` (`.inv-*`, `.rate-*`, `.chest-*`, `.btn` for Inventory) |

## Design tokens

Use Tailwind theme colors — do not hard-code hex in components:

| Token | Tailwind | Legacy CSS var |
|-------|----------|----------------|
| Background | `bg-bg` | `--bg` |
| Panel / card | `bg-panel`, `bg-card` | `--panel`, `--card` |
| Border | `border-border` | `--border` |
| Text | `text-fg`, `text-muted` | `--fg`, `--muted` |
| Primary action | `bg-accent`, `text-accent-fg` | `--accent` |
| Danger | `border-danger`, `text-danger-fg` | — |
| Warning / XP | `text-gold` | `--gold` |

Typography: `font-sans` (Segoe UI / system-ui), 14px body on `body`.

## UI components (prefer these on migrated tabs)

Import from `components/ui/` — **Market button sizing is the reference**.

| Component | Use |
|-----------|-----|
| `Button` | `variant`: `default` \| `primary` \| `danger`; `size`: `default` \| `lg` (Settings save bar) |
| `Field` | Label + control; pass `checkbox` for inline checkbox rows |
| `Input`, `Select` | Form controls inside `Field` |
| `Section` | Subheading (`h2`) + **4px** gap to content |
| `Accordion` | Collapsible advanced blocks (Settings) |
| `TabHeader` | Tab title (**18px / semibold**) + optional intro (**4px** below title) |
| `TabPage` | Root wrapper — **14px** vertical section gap (`gap-3.5`) |
| `ProgressBar` | Accent fill bar (Market refresh, About download) |

Example:

```tsx
import { Button } from "../components/ui/Button";
import { TabHeader } from "../components/ui/TabHeader";
import { TabPage } from "../components/ui/TabPage";

export function ExampleTab() {
  return (
    <TabPage>
      <TabHeader title="Example" intro="One muted sentence for players." />
      <Button variant="primary">Do thing</Button>
    </TabPage>
  );
}
```

## Layout rules

- Main window width is **900px fixed** (no horizontal resize). Do **not** add tab-level `max-width`.
- Form-heavy tabs (Settings, About): wrap body in `max-w-md` inside `TabPage`.
- Section subtitles: use `Section` or match its spacing (`gap-1` under `h2`).
- Player-facing copy in tab intros; technical paths in Settings **Advanced** accordion.

## Migration status

**Tailwind + ui components:** About, Market, Settings, Chests (header CTA only), Live/Inventory (`TabPage` + `TabHeader`).

**Still legacy CSS:** Inventory table/filters, Live rate cards, Chests grid/cards, app chrome (`.tabs`, `.savebar`), overlays, legacy `.btn` on Inventory pricing stop button.

When touching legacy areas, either keep existing classes or migrate the whole surface — avoid half-migrated tabs.

## Adding new styles

1. Prefer `components/ui/*` + Tailwind utilities.
2. Use `cn()` when merging conditional classes.
3. Add shared one-off patterns to `ui/` if used in 2+ places.
4. Add to legacy `styles.css` only for unmigrated complex layout (tables, overlays).
5. Update this doc and `.cursor/skills/tbh-ux/SKILL.md` when migration scope changes.
