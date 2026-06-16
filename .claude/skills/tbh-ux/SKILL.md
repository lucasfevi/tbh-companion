---
name: tbh-ux
description: Keep TBH Companion UI consistent — tab chrome, Inventory-style intros, overlay toolbar (not tab bar), compact Chests layout, tray minimize behavior, and design tokens in styles.css. Use when adding or changing renderer tabs, headers, buttons, overlays, navigation, Chests/Mini/Box tracker UX, or reviewing UI polish in app/src/renderer/. Not for pure backend/core logic, docs-only work, or website styling.
license: CC-BY-4.0
metadata:
  author: tbh-project
  version: 1.0.0
---

# TBH Companion — UX consistency

Follow these patterns so every tab and overlay feels like the same app. **Inventory is the reference tab** for structure and tone.

## Before you change UI

1. Open [`app/src/renderer/tabs/Inventory.tsx`](../../app/src/renderer/tabs/Inventory.tsx) and match its header pattern.
2. Read [`docs/STYLING.md`](../../docs/STYLING.md) and use `app/src/renderer/components/ui/*`; skim [`app/src/renderer/styles.css`](../../app/src/renderer/styles.css) for Electron drag helpers only.
3. If the change touches main-window chrome or tray behavior, read [`app/src/main/tray/trayService.ts`](../../app/src/main/tray/trayService.ts) and [`app/src/main/app/appState.ts`](../../app/src/main/app/appState.ts).
4. For a **new tab from scratch** or large layout refactor, also read [references/patterns.md](references/patterns.md).

## Design tokens (do not drift)

Tailwind `@theme` in `styles.css` — see [`docs/STYLING.md`](../../docs/STYLING.md). Do not add legacy CSS class blocks to `styles.css`.

| Token | Use |
|-------|-----|
| `bg-bg` / `--bg` `#0f1117` | Page / window background |
| `bg-panel`, `bg-card` | Tab bar, cards, inputs |
| `border-border` | Dividers, input borders |
| `text-fg`, `text-muted` | Primary and secondary text |
| `bg-accent` `#5ad17a` | Primary actions, positive states |
| `text-gold` | XP / idle warnings |
| `text-status-info`, `text-status-success`, `bg-status-danger` | Box tracker / chest status accents (see `@theme` in `styles.css`) |
| `text-ideal`, `bg-ideal/15` | Ideal-stage highlight in box tracker level chips |

Typography: Segoe UI / system sans, 14px body. Use `Button`, `Field`, `Card`, `text-muted`, `text-xs` from `components/ui/` — prefer theme tokens over one-off hex colors.

## Main window chrome

```text
[ Live | Inventory | Chests | Market | Settings | About ]     [ Mini ] [ Stage chests ]  ← AppTabBar
[ save status bar ]                                                                        ← SaveStatusBar
[ tab content ]
```

Rules:

- **Tab bar = navigation only.** Never put overlay toggles or actions in the tab `<nav>`.
- **Overlay entry points:** [`AppToolbar`](../../app/src/renderer/components/AppToolbar.tsx) (`ToolbarButton` for Mini + Stage chests), Chests header CTA for box tracker, and system tray menu.
- **Do not use Unicode box glyphs** (`□`, `▣`) as icons — use inline SVG like `AppToolbar`.
- Save status stays below chrome in [`SaveStatusBar`](../../app/src/renderer/components/SaveStatusBar.tsx); do not duplicate save timing inside tabs.

## Tab content pattern (match Inventory)

Each tab should have:

1. **`<TabHeader>`** from [`components/ui/TabHeader.tsx`](../../app/src/renderer/components/ui/TabHeader.tsx) — short `<h1>` title (**18px / semibold**) plus one muted intro line (**4px** below title when present).
2. **Primary controls next** — summary cards, filters, or the main CTA before long lists.

Wrap the tab root in **`<TabPage>`** for **14px** vertical section spacing (`gap-3.5`). Form-heavy tabs (Settings, About): inner column `max-w-md`. The main window defaults to **1100×720** with **fixed width** and **480px** minimum height. Section subtitles use **`Section`** or **4px** between `h2` and content.

Placeholder state (no data yet): same `<h1>` + muted wait message — see Inventory and Chests loading states.

Avoid walls of copy; move rune breakdowns and capacity math into `<details>` or tooltips (see Chests `Card` + capacity details).

**Copy tone:** write for players — no “installed app”, dev-build jargon, or internal timers in tab intros. Technical paths belong in Settings advanced sections.

**App icon:** ship transparent PNG/ICO under `docs/design/icons/` (`companion-icon-*`, `tray-icon-32.png`). Do not use opaque black-background PNGs for tray, taskbar, or website.

## Chests tab

- **3-column grid** on wide layouts (`grid-cols-3`); stack on narrow (`max-[720px]:grid-cols-1`).
- Each category: `Card` with title + `quantity / capacity` + `CapacityBar` + optional `Badge` Full.
- **Box tracker CTA at top** of `TabHeader` children, not only at page footer.
- Goal at 1100×720: all three chest categories visible without scrolling.

## Overlays (Mini + Box tracker)

- Frameless, always-on-top; drag region on chrome; `.no-drag` on buttons.
- Closing Mini must **restore the main window** (handled in main process — do not re-hide main from renderer on close).
- Mini hides main while open; box tracker does not need to hide main.
- Overlay actions use `IconButton` or small `Button size="sm"`, not oversized primary buttons unless intentional.

## Tray and close behavior

- Main window **X → hide to tray**, not quit. Quit only via tray **Quit** or explicit future setting.
- Document tray behavior in Settings intro copy when users might confuse hide with exit.
- Do not call `app.quit()` from renderer; use existing IPC if a quit action is ever added.

## Components and classes to reuse

| Need | Use |
|------|-----|
| Primary button | `<Button variant="primary">` |
| Secondary button | `<Button>` |
| Danger | `<Button variant="danger">` |
| Panel / row card | `<Card>` (`padding="compact"` for dense rows) |
| Form field | `<Field>` + `<Input>` / `<Select>` |
| Collapsible advanced block | `<Accordion variant="panel">` |
| Status badge | `<Badge>` variants (`full`, `info`, `success`, `muted`, …) |
| Progress | `<CapacityBar>` or `<ProgressBar>` |
| Link-style control | `<LinkButton>` |
| Toolbar overlay buttons | `<ToolbarButton>` |
| Overlay icon buttons | `<IconButton>` |

Add new shared UI to `app/src/renderer/components/ui/` when used in more than one place.

## Review checklist (before marking UI work done)

- [ ] Tab bar has only real tabs
- [ ] New tab has h1 + explainer + controls in Inventory order
- [ ] Colors/spacing use existing tokens and classes
- [ ] Overlay entry points use toolbar/tray/Chests CTA — not tab bar
- [ ] Chests changes keep compact grid + top CTA
- [ ] Conditional UI near controls uses reserved space — no layout shift (see [`docs/STYLING.md`](../../docs/STYLING.md) **Layout stability**)
- [ ] Dropdowns use `SelectField` when a chevron gutter is needed
- [ ] Run **tbh-qa** (visual smoke if you changed chrome or Chests layout)

## Examples

### Example 1: New tab

User: "Add a Pets tab."

Actions:

1. Add tab id to `TABS` in `App.tsx` only — no extra buttons in the tab `<nav>`.
2. Create `tabs/Pets.tsx` with `TabPage`, `TabHeader`, muted intro, then content.
3. Reuse `Card`, `StatCard`, or table patterns from Inventory or Live.

Result: Pets feels like Inventory, not a one-off page.

### Example 2: New overlay shortcut

User: "Add a quick way to open the mini overlay from Live."

Actions:

1. Add a contextual `<Button>` or `<LinkButton>` **inside Live tab content** — not the tab bar.
2. Call `window.tbh.openOverlay()` — do not duplicate overlay window logic in renderer.

Result: Discoverable from Live without polluting global chrome.

### Example 3: Chests tweak

User: "Show rune details on Chests."

Actions:

1. Put verbose text in `<details>` inside each `Card`.
2. Keep the grid single-screen at default window size.

Result: Details available without scrolling past three tall sections.

## Troubleshooting

### Tab bar feels crowded

Cause: Actions mixed into tab `<nav>`.
Solution: Move to `AppToolbar`, tab header, or in-tab controls.

### Main window disappears after closing Mini

Cause: Main hidden on overlay open but not shown on close.
Solution: Fix in `appState.ts` / overlay `closed` handler — not renderer-only workarounds.

### Chests requires scrolling at default size

Cause: Tall stacked sections or footer-only CTA.
Solution: Use 3-column grid + header CTA; collapse detail into `<details>`.
