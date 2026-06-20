---
name: design-system
description: TBH Companion's design system — Base UI + Tailwind v4 + cva primitives under app/src/renderer/design-system/, with Storybook as the documentation layer. Use when adding or changing any renderer UI component, choosing between an existing primitive and a one-off element, or writing a new primitive. Pair with tbh-renderer (performance/IPC) and tbh-ux (tab chrome, layout, tone). Not for main/preload, core logic, or bundled data catalogs.
license: CC-BY-4.0
metadata:
  author: tbh-project
  version: 1.0.0
---

# TBH Companion — design system

`app/src/renderer/design-system/primitives/` is the **only** place renderer UI components should live. The old `app/src/renderer/components/ui/` tree has been fully migrated and removed except for two intentional holdouts (see below) — never add a new component there.

## Before you build new UI

1. Check the lookup table below for an existing primitive.
2. **Read the primitive's `.stories.tsx` file**, not this doc, for canonical usage and prop shapes — stories are kept in sync with the component because they're exercised by Storybook + `jest-axe`; prose here would drift. Each story is written with a short "when to use this variant" comment.
3. If nothing fits, build a new primitive under `design-system/primitives/<Name>/` following the pattern in [Adding a new primitive](#adding-a-new-primitive) below.

## Component lookup

| Need | Primitive |
|------|-----------|
| Buttons (any kind), button-styled link | `Button`, `ButtonLink` (`primitives/Button/`) |
| Bordered panel | `Card` |
| Status pill | `Badge` |
| Form text input | `Input` |
| Labeled form row (with optional checkbox layout) | `Field` |
| Dropdown / listbox | `Select` |
| Numeric input with stepping | `NumberField` |
| Anchored popup panel | `Popover` |
| Modal dialog | `Dialog` (+ `DialogTitle`/`DialogClose` from `DialogParts`) |
| Collapsible section | `Accordion` |
| Hover/focus info bubble | `Tooltip` |
| Boolean on/off toggle | `Switch` |
| Tabbed panels (not the main app tab bar — see below) | `Tabs` (+ `TabsList`/`TabsTab`/`TabsPanel` from `TabsParts`) |
| Gold-accent inline callout | `HintBanner` |
| Linear fill bar with label | `ProgressBar` |
| Pill-shaped capacity/cooldown bar | `CapacityBar` |
| Bordered list with zebra-striped rows | `DataList` / `DataListRow` |
| Compact labeled-value stat tile (`variant="highlight"` for a large accent-colored headline value) | `StatCard` |
| Uppercase-label section (optionally boxed in a Card) | `PanelSection` |
| Sentence-case heading + content group | `Section` |
| Top-of-tab `<h1>` + intro | `TabHeader` |
| Tab body vertical-stack wrapper | `TabPage` |
| Three-column hero metric card (Live tab only) | `MetricHero` |

**Intentionally not migrated, stay in `components/ui/`:**
- `OverlayFrame.tsx` — frameless overlay window shell. Conceptually Electron-overlay-specific even though it has no literal Electron imports; moving it into the "portable" tree would be a category error.
- `ExternalLink.tsx` — `inline`/`accent` link variants that aren't button-shaped (the `button`/`primaryButton` variants were absorbed into `ButtonLink` back in the Button migration).

**Not migrated, stays as plain markup:** `AppTabBar.tsx` (the main window's `Live | Inventory | Chests | …` navigation) is still a bare `<nav>` of `<button>`s, not `Tabs`. It also hosts `AppToolbar` (non-tab buttons) in the same row, which makes a `Tabs` migration its own scoped task rather than a drop-in swap. `Tabs` exists and is documented for future tabbed-content use elsewhere in the app.

## The portability boundary (why, not just what)

`design-system/**` is built to be mechanically extractable into a standalone package if a second (e.g. web) consumer ever exists — it must stay Electron/Node-free. An ESLint rule (`eslint.config.mjs`) enforces this: `no-restricted-imports` blocks `electron`, `node:*`, and anything under `**/main/**`/`**/preload/**` for files under `src/renderer/design-system/**`. Primitives never call `useTbhContext()` or touch `window.tbh` directly — they receive all data through props. If you're tempted to reach for app state inside a primitive, stop: that composition belongs in the consuming tab/component, not the primitive.

## The `cva` variant pattern

Every primitive with visual variants uses `class-variance-authority` via `design-system/lib/variants.ts` (`cn`, `cva`, `VariantProps` — re-exported, not re-implemented). One `cva()` call per file, never hand-rolled `Record<Variant, string>` maps. Worked example, trimmed from `Button/buttonVariants.ts`:

```ts
import { cva, type VariantProps } from "../../lib/variants";

export const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md border",
  {
    variants: {
      variant: {
        default: "bg-card border-border text-fg hover:border-accent",
        primary: "bg-accent border-accent text-accent-fg font-semibold",
      },
      size: { default: "px-3.5 py-1.5 text-[13px]", sm: "px-2.5 py-0.5 text-xs" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
export type ButtonVariants = VariantProps<typeof buttonVariants>;
```

If a component file would also export the `cva` object or multiple sub-components alongside its main component, split the extra exports into a sibling file (`buttonVariants.ts`, `TabsParts.tsx`, `DialogParts.tsx`) — co-locating a non-component export with a component breaks Fast Refresh boundary detection (`react-refresh/only-export-components`), and that ESLint rule is enforced project-wide.

## Base UI portals are safe per-window

Each `BrowserWindow` (main, overlay, box tracker) loads the same `index.html` but gets its own separate `document`, so Base UI's default `document.body` portal target is safe per-window — confirmed empirically in this migration's Phase 0 spike. That said, **no Base UI portal component (`Popover`, `Select`, `Dialog`, `Tooltip`) is used inside `Overlay.tsx`/`OverlayFrame.tsx`** — the overlay's frameless 280×94 footprint is the one place a portal escaping bounds would be visually obvious and bad, so overlay code only ever uses non-portal primitives (`Button`, `Switch`).

Some Base UI components don't wire ARIA the way you'd expect from their name — verify against the installed package's `.d.ts` files (`node_modules/@base-ui/react/<component>/`) rather than assuming. Example: `Popover.Popup` gets `role="dialog"` automatically; `Tooltip.Popup` does **not** get `role="tooltip"`/`aria-describedby` automatically in the pinned version — `Tooltip.tsx` wires both manually via `useId()`.

## Layout-stability footer-slot pattern

Conditional UI (reset links, hints, errors) must not shift surrounding layout when it appears or disappears. `Select` and `NumberField` both reserve a fixed `min-h-[1.125rem]` footer slot that always renders — even when `footer` is `undefined` — so the slot's presence is independent of its content. This is enforced by a Testing Library assertion in each component's `.test.tsx` (footer container renders regardless of whether `footer` is passed), not just a convention to remember. Follow this pattern for any new primitive with optional trailing content; see `docs/STYLING.md`'s **Layout stability** section for the broader app-wide rule this primitive-level pattern implements.

## Adding a new primitive

```
design-system/primitives/<Name>/
  <Name>.tsx           # the component (single named export — see Fast Refresh note above)
  <Name>.stories.tsx   # one named export per realistic variant/state, written for an agent learning usage
  <Name>.test.tsx       # Testing Library behavior + jest-axe smoke test
```

- Presentational-only → plain Tailwind + `cva`, no Base UI.
- Needs accessible interactive behavior (focus trap, keyboard nav, portal positioning) → wrap the relevant `@base-ui/react` component (pinned exact version in `app/package.json` — verify before assuming an API from memory or docs, since Base UI is new to this codebase and minor versions can change wiring details, as the Tooltip ARIA example above shows).
- Run `npm run test:dom` (jsdom + Testing Library + `jest-axe`) and `npm run storybook` to verify before considering it done; both are part of the `tbh-qa` `npm run qa` gate.

## Related docs

- `docs/STYLING.md` — design tokens, layout rules, layout-stability rule (app-wide, not component-API).
- `tbh-renderer` — IPC/re-render/bundle-size rules for the renderer process generally.
- `tbh-ux` — tab chrome, navigation conventions, copy tone (component-agnostic UX rules).
