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
2. Skim [`app/src/renderer/styles.css`](../../app/src/renderer/styles.css) for existing classes — reuse before inventing new ones.
3. If the change touches main-window chrome or tray behavior, read [`app/src/main/tray/trayService.ts`](../../app/src/main/tray/trayService.ts) and [`app/src/main/app/appState.ts`](../../app/src/main/app/appState.ts).
4. For a **new tab from scratch** or large layout refactor, also read [references/patterns.md](references/patterns.md).

## Design tokens (do not drift)

Use CSS variables from `:root` in `styles.css`:

| Token | Use |
|-------|-----|
| `--bg` `#0f1117` | Page / window background |
| `--panel`, `--card` | Tab bar, cards, inputs |
| `--border` | Dividers, input borders |
| `--fg`, `--muted` | Primary and secondary text |
| `--accent` `#5ad17a` | Primary actions, positive states |
| `--gold` | XP / idle warnings |

Typography: Segoe UI / system sans, 14px body. Prefer `.muted`, `.small`, `.btn`, `.btn.primary` over one-off colors.

## Main window chrome

```text
[ Live | Inventory | Chests | Market | Settings ]     [ Mini ] [ Boxes ]
[ save status bar ]
[ tab content ]
```

Rules:

- **Tab bar = navigation only.** Never put overlay toggles or actions in `.tabs`.
- **Overlay entry points:** [`AppToolbar`](../../app/src/renderer/components/AppToolbar.tsx) (Mini + Boxes with inline SVG icons), Chests header CTA for box tracker, and system tray menu.
- **Do not use Unicode box glyphs** (`□`, `▣`) as icons — use inline SVG like `AppToolbar`.
- Save status stays in `.savebar` below chrome; do not duplicate save timing inside tabs.

## Tab content pattern (match Inventory)

Each tab should have:

1. **`<h1>` title** — short, scannable (e.g. "Inventory", "Chests", "Live stats").
2. **One or two sentences** of `.muted` explainer — what the tab reads from the save and when to use it.
3. **Primary controls next** — summary cards, filters, or the main CTA before long lists.

Placeholder state (no data yet): same `<h1>` + `.placeholder` + `.muted` wait message — see Inventory and Chests.

Avoid walls of copy; move rune breakdowns and capacity math into `<details>` or tooltips (see compact Chests cards).

## Chests tab

- **3-column `.chest-grid`** on wide layouts; stack on narrow (`max-width: 720px` breakpoint).
- Each category: title + `quantity / capacity` + `.progress-bar.compact` + optional "Full" badge.
- **Box tracker CTA at top** of header (`.chests-header-actions`), not only at page footer.
- Goal at 900×640: all three chest categories visible without scrolling.

## Overlays (Mini + Box tracker)

- Frameless, always-on-top; drag region on chrome; `.no-drag` on buttons.
- Closing Mini must **restore the main window** (handled in main process — do not re-hide main from renderer on close).
- Mini hides main while open; box tracker does not need to hide main.
- Overlay actions use `.icon-btn` / small text buttons, not full `.btn.primary` unless intentional.

## Tray and close behavior

- Main window **X → hide to tray**, not quit. Quit only via tray **Quit** or explicit future setting.
- Document tray behavior in Settings intro copy when users might confuse hide with exit.
- Do not call `app.quit()` from renderer; use existing IPC if a quit action is ever added.

## Components and classes to reuse

| Need | Use |
|------|-----|
| Primary button | `.btn.primary` |
| Secondary button | `.btn` |
| Danger | `.btn.danger` |
| Status badge | `.badge.full` |
| Progress | `.progress-bar` + `.progress-fill.{gray,blue,red}` |
| Link-style control | `.linkish` |
| Toolbar overlay buttons | `.toolbar-btn` + `.toolbar-icon` |

Add new shared UI to `app/src/renderer/components/` when used in more than one place.

## Review checklist (before marking UI work done)

- [ ] Tab bar has only real tabs
- [ ] New tab has h1 + explainer + controls in Inventory order
- [ ] Colors/spacing use existing tokens and classes
- [ ] Overlay entry points use toolbar/tray/Chests CTA — not tab bar
- [ ] Chests changes keep compact grid + top CTA
- [ ] Run **tbh-qa** (visual smoke if you changed chrome or Chests layout)

## Examples

### Example 1: New tab

User: "Add a Pets tab."

Actions:

1. Add tab id to `TABS` in `App.tsx` only — no extra buttons in `.tabs`.
2. Create `tabs/Pets.tsx` with `<h1>Pets</h1>`, muted explainer, then content.
3. Reuse `.card` / table patterns from Inventory or Live.

Result: Pets feels like Inventory, not a one-off page.

### Example 2: New overlay shortcut

User: "Add a quick way to open the mini overlay from Live."

Actions:

1. Add a contextual `.btn` or `.linkish` **inside Live tab content** — not the tab bar.
2. Call `window.tbh.openOverlay()` — do not duplicate overlay window logic in renderer.

Result: Discoverable from Live without polluting global chrome.

### Example 3: Chests tweak

User: "Show rune details on Chests."

Actions:

1. Put verbose text in `<details class="chest-card-details">` on each card.
2. Keep the grid single-screen at default window size.

Result: Details available without scrolling past three tall sections.

## Troubleshooting

### Tab bar feels crowded

Cause: Actions mixed into `.tabs`.
Solution: Move to `AppToolbar`, tab header, or in-tab controls.

### Main window disappears after closing Mini

Cause: Main hidden on overlay open but not shown on close.
Solution: Fix in `appState.ts` / overlay `closed` handler — not renderer-only workarounds.

### Chests requires scrolling at default size

Cause: Tall stacked sections or footer-only CTA.
Solution: Use `.chest-grid` + header CTA; collapse detail into `<details>`.
