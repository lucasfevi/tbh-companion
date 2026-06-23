# Project State — Memory

Persistent decisions, blockers, lessons, and deferred ideas across sessions.

## Active feature

- **filtering-sorting-evolution** — Specify + Design + Tasks + **Execute complete** on branch
  `feat/filtering-sorting-evolution`. All 14 tasks done; `pnpm run qa` + `qa:dev` green.
  P3 follow-ups (T15–T17) deferred. **Not yet committed** — awaiting user approval.

## Decisions

- 2026-06-23 — "Coin view" = the Offering Loot panel (`OfferingLoot.tsx`). [D1]
- 2026-06-23 — Adopt `lucide-react` for sort asc/desc icons (was text `▲▼`). [D2]
- 2026-06-23 — Filter selections are session-only; no config/IPC persistence. [D3]
- 2026-06-23 — Remove the material `targetGroup` / "Applies to anything" filter entirely
  ("Common" = effect applies to any slot; confusing — drop the control + helpers + filter branch). [D4]
- 2026-06-23 — Inventory sort stays on its data table; the new grouped sort control is
  Lookup + Coin view only.

## Deferred ideas

- Saved filter presets / named views (out of scope for this feature).
- Reusing the RangeSlider for inventory value/price/count ranges and Coin view drop-% (P3,
  opt-in during Design).

## Lessons

- pnpm on Windows may skip a new dependency's build/postinstall script — allow-list
  `lucide-react` in `app/pnpm-workspace.yaml` `allowBuilds` if icons fail to resolve.
