# Refactor plan

**Status: complete** (Phases 1–10, 2026-06-09). Kept as a historical record of the
`refactor/maintainability` branch work.

Maintainability, testability, performance, security, and code discipline — aligned with project architecture (`AGENTS.md`) and project skills.

**Branch:** `refactor/maintainability` (ready to merge to `main`)  
**Skills:**

| Skill | Role in plan |
|-------|----------------|
| [coding-guidelines](../.cursor/skills/coding-guidelines/SKILL.md) | Simplicity, surgical diffs, verifiable goals — **every phase** |
| [react-best-practices](../.cursor/skills/react-best-practices/SKILL.md) | Phases 5–7 (renderer perf & data) |
| [best-practices](../.cursor/skills/best-practices/SKILL.md) | Phase 8 (security & quality) |
| [tbh-qa](../.cursor/skills/tbh-qa/SKILL.md) | **Completion gate** — every phase |

---

## Status overview

| Phase | Focus | Status |
|-------|--------|--------|
| **1–4** | Main/core structure (IPC, services, save split, inventory UI extract) | **Done** |
| **5** | Renderer data layer — dedupe IPC, kill waterfalls | **Done** (2026-06-09) |
| **6** | Bundle & tab loading — lazy tabs, direct imports | **Done** (2026-06-09) |
| **7** | Re-render & list rendering — Inventory/Live perf | **Done** (2026-06-09) |
| **8** | Security & quality — CSP, audit, errors, semantics | **Done** (2026-06-09) |
| **9** | Domain backlog — materials, gear variant, locations | **Done** (2026-06-09) — best-effort; some SubKeys still unmapped |
| **10** | **Cleanup** — dead code, shims, docs sync, merge readiness | **Done** (2026-06-09) |

**Execution order:** 5 → 6 → 7 → 8 → 9 (as prioritized) → **10 cleanup before merge to `main`**.

---

## Coding guidelines (cross-cutting)

Apply [.cursor/skills/coding-guidelines/SKILL.md](../.cursor/skills/coding-guidelines/SKILL.md) in **every** phase:

| Principle | How it applies here |
|-----------|---------------------|
| **Think before coding** | State assumptions in PR/commit; spike unknown save fields (Phase 9) before large parsers |
| **Simplicity first** | Prefer one `TbhProvider` over a generic store framework; no DI container unless tests need it |
| **Surgical changes** | Each phase touches only its files; no drive-by refactors in unrelated tabs |
| **Goal-driven execution** | Every phase has exit criteria + tbh-qa; tests before/after for behavior changes |

**During Phases 5–9:** remove imports/orphans **your** changes create; Phase 10 handles repo-wide cleanup.

---

## Completed — Phases 1–10

| Goal | Outcome |
|------|---------|
| Slim bootstrap | `main/index.ts` ~25 lines |
| IPC parity | `shared/ipc.ts`, handlers by domain |
| Pure core | `core/save/snapshot`, `main/io/saveFile`, `core/inventory/*` |
| Services | `TrackingService`, `InventoryService`, `broadcast` |
| Renderer extract | `inventoryFilters.ts`, `GradeBars`, `MarketListingLink` |
| Market split | `priceCache`, `steamPriceApi`, slim `SteamMarketProvider` |
| Config | Unified `AppConfig`; config patch tests |
| QA | `npm run qa`, `npm run qa:dev`, tbh-qa skill, CI workflow |

**Exit criteria met:** no `node:fs` in `core/`, bundle path guards, 66+ tests, typecheck + build green.

**Phase 10 cleanup completed:** shims removed, docs synced, test layout reorganized.

---

## Phase 5 — Renderer data layer (react: `async-*`, `client-*`)

**Problem:** Duplicate IPC subscriptions — `useStats()` in `App` (`SaveStatusBar`) and `Live`; separate inventory/price listeners in Market and Inventory.

**Guidelines:** One context provider, not a state library. Thin hook wrappers only if they reduce churn.

**Skill rules:**

| Rule | Application |
|------|-------------|
| `async-parallel` | Parallel `getStats` + `getInventory` on provider mount |
| `client-event-listeners` | Single `onStats` / `onInventory` / `onPricesProgress` per app |
| `rerender-derived-state-no-effect` | Derive idle/warn in render |

**Work:**

1. `renderer/context/TbhProvider.tsx` — subscribe once, expose hooks.
2. Migrate `App`, `Live`, `Overlay`, `Inventory`, `Market` to context hooks.
3. Verify: grep renderer for duplicate `onStats(` registrations.

**Verify:** tbh-qa pass; one listener per channel.

---

## Phase 6 — Bundle & tab loading (react: `bundle-*`)

**Problem:** All tabs eagerly imported in `App.tsx` (~600 kB chunk).

**Guidelines:** Lazy tabs only — no speculative route framework.

**Skill rules:** `bundle-dynamic-imports`, `bundle-conditional`, `bundle-barrel-imports` (direct `core/*` imports in renderer; barrels for main/tests only).

**Work:**

1. `React.lazy` + `Suspense` per tab; eager shell (nav + save bar).
2. Audit renderer `core/` imports for accidental heavy pulls.
3. Record bundle sizes before/after in PR.

**Verify:** tbh-qa pass; tab switch works; chunk split or smaller initial load.

---

## Phase 7 — Re-render & list rendering (react: `rerender-*`, `rendering-*`, `js-*`)

**Problem:** Full Inventory table re-renders on price ticks; large filter state in one component.

**Guidelines:** Split components only where profiling/measurement justifies it — no deep component trees for aesthetics.

**Skill rules:** `rerender-memo`, `rendering-content-visibility`, `js-index-maps`, `rerender-transitions` for price progress.

**Work:**

1. Extract `InventoryTable`, `InventoryFilters`, `InventorySummary`.
2. CSS `content-visibility` on long lists.
3. `startTransition` for non-urgent price UI updates.

**Verify:** tbh-qa pass; manual scroll with large inventory.

---

## Phase 8 — Security & quality (best-practices)

**Problem:** Partial CSP; silent hook catches; no audit in CI; root-level error handling gaps.

**Guidelines:** Document security tradeoffs in `DECISIONS.md`; minimal CSP changes that don't break dev.

**Work:** Complete CSP, `npm audit` in CI, root `ErrorBoundary`, dev-only error logging, prod source maps off, semantic HTML for shell, IPC cleanup audit.

**Verify:** tbh-qa pass; audit clean or waivers documented.

---

## Phase 9 — Domain backlog (product fixes)

**Guidelines:** One bug per PR; write a failing test first when format is known (`Goal-driven execution`).

| Item | Notes |
|------|--------|
| Materials parsing | `aggregateSaveDatas` — spike then implement |
| Gear variant | Stop hardcoding ` A` in `marketName.ts` |
| Unknown location `?` | Slot mapping edge cases |
| Optional DI | Only if test pain remains after Phase 5 |
| Branding | Icon in electron-builder |

**Verify:** tbh-qa + targeted test/realSave where applicable.

---

## Phase 10 — Cleanup (last step before merge)

**Purpose:** Consolidate the refactor branch into a shippable, readable tree. This is the **only** phase that intentionally deletes legacy indirection and syncs docs — not drive-by cleanup during 5–9.

**Guidelines applied:**

| Principle | Cleanup action |
|-----------|----------------|
| **Surgical → deliberate** | Remove orphans **created by Phases 1–9**, not speculative rewrites |
| **Simplicity first** | Delete shims once imports updated; collapse redundant layers |
| **Goal-driven** | Checklist below must be all ✅ before merge to `main` |

### 10.1 — Code removal

- [x] Remove back-compat re-exports if unused: `core/saveReader.ts`, `core/inventory.ts` (update imports to `core/save/snapshot`, `core/inventory/*`)
- [x] Remove duplicate type exports (`GameDataStatus` — single source in `shared/types.ts`)
- [x] Remove unused exports (run `tsc --noEmit` + grep for orphaned files)
- [x] Remove migration-only hook aliases after context migration (Phase 5)
- [x] Delete commented-out code and stale TODOs introduced during refactor
- [x] Confirm no `../../preload` or wrong paths outside `main/paths.ts`

### 10.2 — Structure & imports

- [x] Renderer: no imports from `main/` or `node:fs`
- [x] Core: no Electron/React/fetch
- [x] IPC: all channels in `shared/ipc.ts`; `test/ipc/channels.test.ts` green
- [x] Consistent file naming under `renderer/components/`, `main/services/`, `main/ipc/handlers/`

### 10.3 — Tests & QA

- [x] `npm run qa` green
- [x] `npm run dev` — non-blank window, all tabs once (or `npm run qa:dev` when headless)
- [x] Test layout mirrors source: `test/core/`, `test/main/`, `test/ipc/`, `test/renderer/`, `test/integration/`
- [x] No skipped tests without comment

### 10.4 — Documentation sync

- [x] `AGENTS.md` — architecture table matches final folders
- [x] `docs/ARCHITECTURE.md` — update process diagram (services, paths, context)
- [x] `docs/DECISIONS.md` — ADR entries for CSP, sandbox, context provider, cleanup removals
- [x] `docs/plans/refactor-plan.md` — mark Phases 5–10 done with dates
- [x] `README.md` — `npm run qa` / dev instructions
- [x] Mark fixed items in `docs/reviews/playtest-bugs.md` — waived (draft docs untracked per user)

### 10.5 — Repo hygiene

- [x] No personal save data staged (`.es3`, decrypted dumps)
- [x] Untracked review/design docs either committed or `.gitignore`d intentionally
- [x] LF line endings; no accidental CRLF-only noise commits
- [x] `npm audit` — no unwaived high/critical

### 10.6 — Merge readiness

- [x] Rebase or merge `main`; resolve conflicts with tbh-qa after
- [x] Single squashed or phased commit history per team preference
- [ ] PR description: what changed, QA evidence, known deferred bugs — open PR when ready

**Exit criteria:** All 10.x checkboxes ✅ + tbh-qa + user sign-off on remaining playtest bugs.

---

## Cross-cutting requirements (every phase)

### Architecture

See `AGENTS.md` — four layers, `main/paths.ts`, `app/appState.ts` + services.

### React skill (Electron notes)

Skip `server-*` / Next.js-only rules. Use `React.lazy` not `next/dynamic`.

### QA (mandatory)

```powershell
cd app
npm run qa
npm run dev   # or npm run qa:dev when UI not visible
```

Phase **not done** until tbh-qa required steps pass.

---

## Suggested timeline (historical)

```
Done:     Phases 1–10 (2026-06-09)
Next:     merge refactor/maintainability → main; open PR
```

---

## Metrics (optional)

| Metric | How |
|--------|-----|
| Renderer bundle | `out/renderer/assets/*.js` |
| IPC listeners | one `onStats` / `onInventory` in renderer |
| Tests | `npm test` — 66+ (see `test/core/`, `test/integration/`) |
| Audit | `npm audit` high/critical |
| Dead code | shim files removed in Phase 10 |

---

## References

- `AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/reviews/playtest-bugs.md`
- `.cursor/skills/coding-guidelines/SKILL.md`
- `.cursor/skills/react-best-practices/`
- `.cursor/skills/best-practices/SKILL.md`
- `.cursor/skills/tbh-qa/SKILL.md`
