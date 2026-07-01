# Project State — Memory

Persistent decisions, blockers, lessons, and deferred ideas across sessions.

## Active feature

- **live-memory-reader** — **Phase 2 complete (Core stats), Verifier PASS**. Umbrella spec + phase
  roadmap: `.specs/features/live-memory-reader/{spec,context,ROADMAP}.md`. Opt-in, read-only live
  game-memory reader feeding existing panels (per-stat live-preferred/save-fallback), isolated
  `utilityProcess`, runtime self-healing offsets. 4 build phases, each its own branch/PR/session.
  Reference POC on `feat/live-memory-poc` (rebuilt clean, not merged). Research notes:
  `_research/live-memory/*` (gitignored).
  - **Phase 1** on branch `feat/live-memory-foundation` (20 atomic commits off `main`): opt-in toggle +
    consent dialog, isolated koffi `utilityProcess` reader, version-gated offset resolution, per-stat
    stage live/save blend into `Live.tsx`, global toolbar status indicator, dev-only diagnostics tab,
    packaging (koffi `asarUnpack` + qa-gate worker-entry guard). Design/tasks/validation:
    `.specs/features/live-memory-reader/phase-1-foundation/{design,tasks,validation}.md`. `pnpm qa`
    green (734 tests); Verifier PASS (7/7 ACs, sensor 3/3 killed, no fix tasks). LMR-01..09 + LMR-15
    (seed) Verified. **Manual smoke still owed before ship:** AC3 (<50 ms attach), AC4 (real
    separate-process tick vs game v1.00.21), LMR-09 (packaged NSIS installer runs the reader).
  - **Phase 2** on branch `feat/live-memory-core-stats` (PR #105): live gold
    (ObscuredLong / GoldPinState / stale-pin retry), live heroes (`StageManager.HeroList` →
    `Unit.cache` → `HeroRuntime` ObscuredFloat exp), unified `LiveSessionMeter` for live XP+gold
    rates at ~25 Hz (party total exp delta, stats push every frame), session reset on live-memory
    toggle, chest-drop **plumbing stub** (live per-type tracking deferred to Phase 3), removal of
    `Player.log` / `playerLog.ts`, inventory + pet live reads (offset-gated — real offsets derived in
    Phase 3), expanded diagnostics (current gold, per-hero exp, tracker rates). Design/tasks/validation:
    `.specs/features/live-memory-reader/phase-2-core-stats/`. `pnpm qa` green (548 tests).
    Verifier PASS on initial ship; post-PR polish documented in `validation.md` § Post-verifier.
    **LMR-12 partial:** Player.log removed + integration wired; **common / stage boss / act boss live
    session rates = Phase 3.**
    **Placeholder offsets still 0 (gated → null):** `boxCount`, `localInventoryManager` TypeInfo RVA,
    `player.petSaveDatas`, `petSaveData.*`, `inventoryItem.*` — Phase 3 derives real values.
  - **Locked offset schema (Phase 3 consumes this — must not drift):** `LiveOffsets` in
    `app/src/core/liveMemory/offsets.ts`. The runtime extractor (Phase 3) must emit exactly this shape.
  - **Next:** Phase 3 `feat/live-memory-extractor` — LMR-12 complete (live chest drops by type) +
    LMR-16..19 runtime self-healing offset extractor. See ROADMAP.md for phase entry-reading lists.
- **primitive-adoption** — **Planned** (`.specs/features/primitive-adoption/{spec,tasks}.md`).
  Review outcome: design system is broadly well-adopted (zero raw select/table/details/anchor).
  5 workstreams: T1 Accordion chevron affordance, T2+T3 new `Slider` primitive + Settings
  migration, T4 raw checkbox → `Checkbox` primitive (×8 sites), T5 AppTabBar → `Tabs` (closes
  role=tablist a11y gap), T6 document intentional keep-as-raw cases (SortControl seam, tracker
  chips, info button, ItemLink). Not yet started.
- **lookup-filter-performance** — **Complete** on branch `feat/filtering-sorting-evolution`.
  `React.memo` + `[content-visibility:auto]` on `ItemCard`, `useCallback` for `onSelect`,
  `useDeferredValue(query)` in `Lookup.tsx`. Benchmark added at
  `app/test/bench/lookupFilter.bench.ts`. [R8]
- **filtering-sorting-refinements** — **Complete & committed** on branch
  `feat/filtering-sorting-evolution` (9 atomic commits + docs commit). Chrome
  consistency (count "{n} items" beside search, no search label, checkboxes for
  toggles), Coin view = search-only, Inventory reposition/renames, Lookup
  adaptive setups + grouped Modifier/Gear type + segmented sort, MultiSelect
  padding bug (root cause: `Combobox.Empty` wrapper always in DOM — moved
  padding into child span), Storybook checkbox stories. Deviations: deleted
  orphaned FilterBar, added Select `triggerClassName`, memoized Lookup option
  helpers. `pnpm run qa` + `qa:dev` green.
- **filtering-sorting-evolution** — **Complete & committed** (12 atomic
  commits). `qa` + `qa:dev` were green.

## Decisions

- 2026-06-23 — "Coin view" = the Offering Loot panel (`OfferingLoot.tsx`). [D1]
- 2026-06-23 — Adopt `lucide-react` for sort asc/desc icons (was text `▲▼`). [D2]
- 2026-06-23 — Filter selections are session-only; no config/IPC persistence. [D3]
- 2026-06-23 — Remove the material `targetGroup` / "Applies to anything" filter entirely
  ("Common" = effect applies to any slot; confusing — drop the control + helpers + filter branch). [D4]
- 2026-06-23 — Inventory sort stays on its data table; the new grouped sort control is
  Lookup + Coin view only.
- 2026-06-23 — Lookup perf: reuse Inventory's `memo` + `[content-visibility:auto]` pattern on
  `ItemCard`; use `useDeferredValue` for search (no windowing lib needed). [R8]
- 2026-06-26 — Single-value sliders get a new `Slider` primitive (mirrors `RangeSlider`); not
  forcing dual-thumb RangeSlider into single-value use. [D5]
- 2026-06-26 — Checkbox migration: `Checkbox` primitive owns its label; drop `Field checkbox`
  layout for migrated rows, because native-`<label>` click-to-toggle doesn't forward to Base UI's
  button-based checkbox. [D6]
- 2026-06-26 — Keep-as-raw (documented, intentional): SortControl direction toggle (glued
  button-group seam), ChestsTrackerPanel toggle chips (no Chip primitive), itemCardParts 16px info
  button. `ToggleChip` flagged as future primitive. [D7]
- 2026-06-26 — `ItemLink` is promoted (NOT keep-as-raw): it will soon cover **all** game entities
  (currently items/materials/gears/coins/chests → adding stages, monsters, bosses). Split into a
  domain-free `EntityLink` primitive (icon + colored label + optional peek/suffix, button-vs-span)
  + thin domain wrappers (`ItemLink`, future `StageLink`/`MonsterLink`). Wrapper moves out of
  `components/lookup/` to a shared home. Can't be a primitive as-is (imports core/lookup + domain
  types + composes ItemCard/BoxPeekCard → breaks portability boundary). [D8]
- 2026-06-29 — Lookup market prices use a **shared snapshot** built server-side by a scheduled
  GitHub Action (every 6h), separate from owned-inventory pricing (`prices.{CUR}.json`). Clients
  download one `prices.json` and never call Steam for Lookup. [D9]
- 2026-06-29 — `core/marketName` is the **single source** of `market_hash_name` derivation, reused
  by the snapshot Action and the client so they can't drift. [D10]
- 2026-06-29 — Lookup "listed price" = **lowest active listing only**; no median fallback (no
  listing ⇒ "No listed price"). [D11]
- 2026-06-29 — Snapshot is published as a **rolling `lookup-prices` GitHub Release asset**
  (`--latest=false`, non-semver tag so the electron-updater ignores it). Client refresh mirrors the
  app-update check (poll release metadata). [D12]
- 2026-06-29 — Snapshot stores **USD prices + an FX table** (frankfurter.app); the client converts
  client-side, so switching currency needs no re-download. [D13]
- 2026-06-29 — Lookup price UI: green accent (`--color-accent`), neutral Steam logo, update-check on
  launch + every 30 min. Placement: **top-right of the header on every surface** — grid card
  (clickable), detail panel (clickable), peek (non-clickable). (Initially built as a grid footer
  bar; moved to top-right per user.) "No listed price" stays clickable. Clickability derives from
  `Boolean(onSelect)` on `ItemCard`. [D14]
- 2026-06-30 — Live memory reader: **opt-in**, off by default, one-time consent dialog on first enable
  (read-only, never modifies game/save, may break on game updates). [D15]
- 2026-06-30 — Reader runs in an isolated Electron `utilityProcess` (koffi FFI), never main/renderer;
  frames via main-hop broadcast (direct `MessagePort` only if latency ever measures as a problem). [D16]
- 2026-06-30 — Data blend is **per-stat: live preferred, save fallback**. No global live-mode switch;
  reader OFF ⇒ app behaves exactly as today. [D17]
- 2026-06-30 — Patch resilience: **runtime self-healing anchor-based offset extractor** (primary) +
  bundled last-known-good offsets (fast path) + degraded banner. **No** remote offset fetch. Resolution
  order: exact-version bundled → runtime self-heal → degraded. Bundled + extractor share ONE offset
  schema (must not drift). [D18]
- 2026-06-30 — Live data feeds the **existing panels** in place (no player-facing "Live (RAM)" tab);
  a **dev-only diagnostics tab** exists for debugging. [D19]
- 2026-06-30 — Chest drops: **remove `Player.log` in Phase 2**; **live session tracking (common /
  stage boss / act boss separately) ships in Phase 3** with derived offsets. No log fallback. [D20]
- 2026-06-30 — XP/hr & gold/hr **recomputed from live samples** (rolling window) when reader on; save-
  snapshot rate math kept for reader-off fallback. [D21]
- 2026-06-30 — Live reader is **rebuilt clean from research** (`_research/live-memory/*`); the
  `feat/live-memory-poc` branch is reference only, not merged. Actual dealt DPS is **out of scope**
  (read-only can't get it); only estimated DPS (AD×AS). [D22]
- 2026-07-01 — Live-memory chain/dictionary-walk logic lives in **pure `core/liveMemory/` behind an
  injected `MemoryReader` interface** (`{ readBytes(addr, size) }`), not in `main/` like the POC. Keeps
  `core/` unit-testable over synthetic memory maps; only `OpenProcess`/`RPM`/module-enum + the poll loop
  stay impure (worker + `main/`). [D23]
- 2026-07-01 — **Snapshot-minimal / schema-complete split.** `LiveMemorySnapshot` carries only stats a
  panel consumes (Phase 1 = stage only); the **`LiveOffsets` schema in `core/liveMemory/offsets.ts` is
  complete and locked now** (currency/`ObscuredLong`, stage, hero, container, dict) — it is the shared
  schema Phase 3's runtime extractor must emit into, and must not drift. [D24]
- 2026-07-01 — **LMR-09 packaging contract:** koffi ships via electron-builder `asarUnpack` (prebuilt
  `.node`), the reader worker is a second electron-vite main entry (`out/main/liveMemoryWorker.js`), and
  a `qa-gate` guard asserts the worker entry is emitted. koffi approved in `pnpm-workspace.yaml`
  `allowBuilds`. Verify on a real `pnpm dist` installer, not just dev/build. [D25]
- 2026-07-01 — Phase 1 vertical-slice stat = **current stage/wave** (live-preferred over save in
  `Live.tsx`); reader **status indicator lives in the global `AppToolbar`** (Badge, off/attached/degraded).
  Gold (ObscuredLong jitter) deferred to Phase 2. [D26]
- 2026-07-01 — Live hero XP reads **`HeroRuntime` ObscuredFloat exp** (party via `Unit.cache`), not
  save-layer `HeroExp`. Session gain uses **party total exp delta**; save path owns XP only when live
  frames are absent (`LIVE_TAKEOVER_SEC`). [D27]
- 2026-07-01 — Live XP and gold share **`LiveSessionMeter`** in `core/tracker.ts` — same takeover,
  gain, and per-tick rate refresh. `pushStats()` on every live frame (~25 Hz). [D28]
- 2026-07-01 — Toggling live memory **resets session stats** (confirm dialog) — save vs runtime
  baselines must not mix. Persisted sessions tag `liveMemoryEnabled`; implausible totals discarded on
  restore. [D29]
- 2026-07-01 — Dev diagnostics tab shows **current gold**, **per-hero live exp**, and tracker
  session/rolling rates for debugging read vs rate math. [D30]
- 2026-07-01 — **Live chest drops = Phase 3.** Phase 2 only removes `Player.log` and wires the delta
  hook; `boxCount` offset stays 0 until derivation. Phase 3 must track **common**, **stage boss**, and
  **act boss** chests in **separate** session buckets (not a single undifferentiated counter). [D31]

## Deferred ideas

- Saved filter presets / named views (out of scope for this feature).
- Reusing the RangeSlider for inventory value/price/count ranges and Coin view drop-% (P3,
  opt-in during Design).

## Lessons

- pnpm on Windows may skip a new dependency's build/postinstall script — allow-list
  `lucide-react` in `app/pnpm-workspace.yaml` `allowBuilds` if icons fail to resolve.
