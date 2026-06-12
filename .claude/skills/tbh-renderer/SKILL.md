---
name: tbh-renderer
description: TBH Companion React renderer performance and patterns for Electron + Vite (not Next.js). Use when writing or reviewing app/src/renderer/ — components, hooks, TbhProvider, bundle size, re-renders, long lists, and IPC consumption. Pair with tbh-ux for chrome and layout. Not for main/preload (tbh-main) or server/RSC patterns.
license: CC-BY-4.0
metadata:
  author: tbh-project
  version: 1.0.0
  source: forked from Vercel react-best-practices (Electron-applicable subset)
---

# TBH Companion — renderer performance

React UI runs in Electron's renderer: **Vite + client-only React**. There is no Next.js, RSC, or server actions. Data arrives via `window.tbh` and `TbhProvider` — optimize IPC subscriptions and re-renders, not server waterfalls.

For tab chrome, tokens, and layout, also read **tbh-ux** and `docs/STYLING.md`.

## TBH-specific renderer rules

1. **One IPC listener per channel** in `TbhProvider.tsx` — tabs use `useStats` / `useInventory` / `usePrices`; do not add duplicate `window.tbh.on*` subscriptions in tabs.
2. **No `fetch` to local files or save paths** — all file/network work stays in main; renderer calls IPC.
3. **Dynamic import heavy tabs or modals** with `React.lazy` + `Suspense` when they are not needed on first paint (e.g. large one-off panels).
4. **Prefer deriving state during render** over `useEffect` + `setState` mirroring props (see references).
5. **Functional `setState`** when updating from previous state in callbacks — avoids stale closures in IPC handlers.
6. **Long lists** (inventory rows): consider `content-visibility: auto` or virtualization if scroll jank appears — profile before optimizing.
7. **Errors:** `reportIpcError` — never `console.log` alone for failures users need support to see.

## Priority categories (when to apply)

| Priority | Topic | When |
|----------|--------|------|
| CRITICAL | Bundle size | New dependencies, large components, icon packs — import directly, lazy-load heavy UI |
| HIGH | Re-render / IPC | New tab state, context changes, frequent stats updates |
| MEDIUM | Rendering | Long lists, conditional UI, transitions for non-urgent updates |
| LOW | JS micro-opts | Hot loops in filters/sorts — prefer `core/` or `renderer/lib/` pure helpers |

**Ignore for this app:** Next.js `server-*` rules, RSC serialization, `React.cache()` across requests, API route waterfalls, SWR (unless you introduce it project-wide).

## Quick reference

- Derive during render, not effects → `references/performance.md` § Re-renders
- `useMemo` only for expensive work — not simple boolean expressions
- `startTransition` for non-urgent UI updates (search/filter) when input feels laggy
- Passive `{ passive: true }` on scroll/touch listeners that do not call `preventDefault`
- `toSorted()` / spread-copy instead of mutating `.sort()` on props/state arrays
- Hoist static JSX and RegExp outside components when reused every render
- Explicit ternary for conditional render when value can be `0`

## Deep dive

Read [references/performance.md](references/performance.md) when refactoring a hot path or reviewing a PR that touches list rendering, context, or bundle imports.

## Examples

### Example 1: New tab consuming stats

Use `useStats()` from context; do not register another `onStats` listener in the tab file.

### Example 2: Heavy settings panel

`const SettingsAdvanced = lazy(() => import('./SettingsAdvanced'))` with a small `Suspense` fallback inside Settings only.

### Example 3: Inventory filter lag

Move filter/sort to `useMemo` over stable inputs; wrap filter application in `startTransition` if typing stutters.
