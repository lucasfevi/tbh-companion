# Live Memory Reader — Phase Roadmap

> **Purpose:** this feature spans multiple sessions. Each phase is its own branch + PR + session.
> This file is the map so a fresh session can start a phase cold with minimal context. Read this +
> [`spec.md`](spec.md) + [`context.md`](context.md) + the phase's own folder, and nothing else.

## How to start a phase in a new session (handoff protocol)

1. Read `.specs/project/STATE.md` → **Handoff** (in-flight state) + **Decisions** (active constraints).
2. Read `.specs/features/live-memory-reader/ROADMAP.md` (this file) → find your phase.
3. Read `spec.md` (requirement IDs for your phase) + `context.md` (locked decisions).
4. Read the phase's **Entry reading** list below (research notes + reference POC files).
5. Re-invoke `tlc-spec-driven` for that phase: it auto-sizes Design/Tasks, then Execute + Verifier.
   Write the phase's `design.md` / `tasks.md` into `.specs/features/live-memory-reader/<phase-dir>/`.
6. One branch per phase, atomic commits per task, one PR. Run `pnpm qa` before "done" (see
   `docs/agent/QA.md`). Update STATE.md Handoff + this file's status column on finish.

**Golden rules across all phases:**
- Read-only always. Never `WriteProcessMemory`, never inject, never modify the save.
- Keep `core/liveMemory/` pure (no `electron`, no `node:fs`, no `fetch`, no React) — FFI + process I/O
  live only in the `utilityProcess` worker + `main/`. Unit-test pure parts over mocked buffers.
- Per-stat blend: live-preferred, save-fallback. Reader OFF ⇒ app behaves exactly as today.
- Never name any third-party memory-reading tool/project in code/app/docs.
- Bundled offset table schema and the runtime extractor's output are **one shared schema** — they must
  not drift (Phase 3 depends on this being locked in Phase 1).

## Phase status

| Phase | Title | Branch | Reqs | Depends on | Status |
| ----- | ----- | ------ | ---- | ---------- | ------ |
| 0 | Planning (this session) | `main` (docs) | — | — | ✅ Done |
| 1 | Foundation & opt-in vertical slice | `feat/live-memory-foundation` | LMR-01..09, 15(seed) | 0 | ✅ Done (Verifier PASS) |
| 2 | Core live stats into existing panels | `feat/live-memory-core-stats` | LMR-10..14, 15(expand) | 1 | ✅ Done (Verifier PASS) |
| 3 | Runtime self-healing offset extractor | `feat/live-memory-extractor` | LMR-16..19 | 1 (schema) | ⬜ Not started |
| 4 | Follow-up live stats (split into sub-PRs) | `feat/live-memory-<stat>` | LMR-20..24 | 1, 3 | ⬜ Not started |

Sequencing note: Phase 2 and Phase 3 both depend only on Phase 1's offset schema + reader plumbing.
Phase 2 (stats) is recommended **before** Phase 3 (extractor) because bundled offsets already cover the
current version, so stats deliver player value immediately, and locking the offset schema against real
stats makes the extractor's target concrete. Accepted risk: if the game patches before Phase 3 ships,
live breaks until a manual re-derive + bundled-offset release (degraded banner covers users meanwhile).

---

## Phase 1 — Foundation & opt-in vertical slice

**Goal:** the opt-in toggle + isolated reader process + offset resolution + per-stat blend plumbing,
proven end-to-end by making **one** stat (gold or stage) live in its existing panel. This is the
architecture spine every later phase plugs into. Off by default; app unchanged when off.

**Requirements:** LMR-01..09, seed LMR-15.

**Entry reading:** `_research/live-memory/00-findings.md`, `01-architecture.md`, `20-poc-integration.md`;
reference POC files on `feat/live-memory-poc`: `app/src/main/liveMemory/{winProcess,statics,runtime,reader,worker}.ts`,
`app/src/main/services/LiveMemoryService.ts`, `app/src/core/liveMemory/{offsets,obscured}.ts`,
`app/src/preload/index.ts`, `app/src/renderer/lib/useLiveMemory.ts`, `app/electron.vite.config.ts` (2nd main entry),
`app/pnpm-workspace.yaml` (`allowBuilds: koffi`). App integration seam: `app/src/renderer/tabs/Live.tsx` + `lib/useStats.ts`.

**Scope outline (turn into tasks.md in-session):**
- `config.json`: add `liveMemory: { enabled: false, consentAccepted: false }` (+ types in `shared/types.ts`,
  config read/write in main). Off by default.
- Settings toggle + one-time consent dialog (design-system primitives). Accept sets `consentAccepted`.
- `core/liveMemory/` (pure, unit-tested over mocked buffers): `obscured.ts` (ObscuredLong decode),
  `offsets.ts` (versioned bundled offset table + the **shared schema** used by Phase 3), chain/dictionary
  walk helpers, plausibility guards.
- `main/liveMemory/` (impure): `winProcess.ts` (koffi kernel32 — OpenProcess QUERY|VM_READ, RPM, module
  enum), `statics.ts` (TypeInfo RVA → `Il2CppClass*` → `static_fields`), `runtime.ts` + `reader.ts`
  (resolve one live value), `worker.ts` (`utilityProcess` entry: adaptive poll loop, posts frames).
- `services/LiveMemoryService.ts`: fork worker on enable, stop on disable (no app restart), auto
  re-attach via `isAlive`, broadcast frames. Lifecycle tied to the enable toggle (not tracking start).
- IPC: `LIVE_MEMORY` (push) + `LIVE_MEMORY_STATUS` + `GET_LIVE_MEMORY` (invoke) in `shared/ipc.ts`,
  `main/ipc/registerIpc.ts`, preload; contract test in `test/ipc/channels.test.ts`.
- Renderer: isolated subscription hook (NOT `TbhProvider` — avoid app-wide re-render at poll rate);
  wire the **existing** panel's one proven stat to prefer the live value; small reader status indicator.
- Version detect (`Version.txt` next to exe) → pick bundled offset table; unknown ⇒ degraded banner.
- Seed the **dev-only diagnostics tab** (attach state, version, cadence, last read, pin health).
- Packaging (LMR-09): `pnpm dist` NSIS includes koffi `.node` + the reader worker entry; verify on a
  real installer, not just dev/build.

**Verification / done:** `pnpm qa` green; manual: toggle on with game v1.00.21 → the chosen stat ticks
< one poll interval; toggle off → reverts to save value, worker stops; kill game → degraded/retry; packaged
installer runs the reader. Verifier (author≠verifier) writes `validation.md`.

**Handoff on finish:** update STATE.md Handoff + this table; note the final offset-table schema location
(Phase 3 consumes it) and any deviations.

**✅ Completed 2026-07-01** on `feat/live-memory-foundation` (20 atomic commits off `main`; `pnpm qa`
green, 734 tests; Verifier PASS — `phase-1-foundation/validation.md`). Delivered the opt-in toggle +
consent, isolated koffi `utilityProcess` reader, version-gated offset resolution, and the per-stat
**stage** live/save blend proving the spine end-to-end; global toolbar indicator; dev-only diagnostics
tab; koffi `asarUnpack` + qa-gate worker-entry guard.
- **Locked offset schema (Phase 3 must emit this exact shape):** `LiveOffsets` in
  `app/src/core/liveMemory/offsets.ts`. Bundled table for game **v1.00.21** only.
- **Design deviations from the POC (intentional):** chain/dictionary-walk logic moved into **pure
  `core/liveMemory/`** behind an injected `MemoryReader` (POC had it in `main/`) so it is unit-tested
  over synthetic memory maps [D23]; **snapshot-minimal / schema-complete** split — Phase 1 emits only
  `stage`, though the schema covers gold/`ObscuredLong`/hero [D24]. `TbhApi` method decls landed with the
  preload impl (not the shared-types task) to keep every commit type-clean.
- **Still owed before ship (manual/runtime, not code-assertable):** AC3 `<50 ms` attach, AC4 real
  separate-process live tick vs game v1.00.21, LMR-09 packaged NSIS installer runs the reader.

---

## Phase 2 — Core live stats into existing panels

**Goal:** wire the user's main-priority stats to memory, blended per-stat, with rates recomputed from
live samples. Retire the broken `Player.log` chest path.

**Requirements:** LMR-10..14, expand LMR-15.

**Entry reading:** `_research/live-memory/10-offset-derivation.md`, `00-findings.md` (stat feasibility
table); reference POC `il2cpp*` readers on `feat/live-memory-poc` under `poc/memory-reader/src/offsets/`
(heroes, inventory, stage, gold); app seams: `core/tracker.ts`, `core/chestDropTracker.ts`,
`core/playerLog.ts` (to remove), `core/inventory/*`, `core/pets/*`, hooks `lib/useStats/useInventory/useChests/usePets`.

**Scope outline:**
- Live gold + current gold; gold/hr recomputed from live samples (rolling window) — extend `tracker.ts`
  behind the reader-on path, keep save-path math for fallback.
- Live XP/level for all party heroes (`StageManager.HeroList` → `Unit.cache` → `HeroRuntime` ObscuredFloat exp) + XP/hr live via `LiveSessionMeter`.
- Chest drops from memory (`StageManager.OnGetBox` / box-count delta); **remove `Player.log` tail**
  (`core/playerLog.ts` + wiring) and update `Live.tsx` chest copy/tooltips.
- Inventory/stash live listing (`LocalInventoryManager` bag dicts) blended into inventory panels.
- Pet info + unlock kill counts live.
- Expand diagnostics tab with per-stat read health.

**Verification / done:** per-AC manual pass while farming; reader-off fallback pass; `pnpm qa` green;
Verifier writes `validation.md`.

**✅ Completed 2026-07-01** on `feat/live-memory-core-stats` (PR #105; `pnpm qa` green, 548 tests).
Delivered live gold (ObscuredLong / GoldPinState), live heroes (`HeroList` → `Unit.cache` →
`HeroRuntime`), unified `LiveSessionMeter` live XP+gold rates (~25 Hz, stats push every frame),
session reset on live-memory toggle, `ChestDropTracker.recordLiveBoxDrop()` box-count-delta drops,
removal of `Player.log` / `playerLog.ts`, inventory + pet live reads (offset-gated), and expanded
diagnostics (current gold, per-hero exp, tracker rates). See `phase-2-core-stats/validation.md` for
verifier report + post-PR polish notes.
- **Placeholder offsets still 0 (wire is in, offsets derived in Phase 3):** `boxCount`, `localInventoryManager`
  TypeInfo RVA, `player.petSaveDatas`, `petSaveData.*`, `inventoryItem.*` — all gated to return `null`.
- **Next:** Phase 3 `feat/live-memory-extractor` (LMR-16..19) runtime self-healing offset extractor, OR
  Phase 4 sub-PRs (Phase 2 and Phase 3 are independently sequenceable from Phase 1).

---

## Phase 3 — Runtime self-healing offset extractor

**Goal:** in-app anchor-based offset derivation so unknown game versions self-heal without an app
release. Riskiest phase; sequenced after the offset schema is locked and stats prove the targets.

**Requirements:** LMR-16..19.

**Entry reading:** `_research/live-memory/00-findings.md` (anchors + structural signatures),
`10-offset-derivation.md` ("Re-derive on next patch" recipe); `tbh-data` repo:
`docs/EXTRACTION.md`, `docs/DECOMPILATION.md`, `docs/TYPE_MAP.md`, `scripts/extract.mjs`,
`scripts/diff-il2cpp.mjs`, `scripts/dump-method-names.mjs` (offline pipeline to port the metadata-parse step from).

**Scope outline:**
- Parse `global-metadata.dat` (from the game install) + `GameAssembly.dll` registration
  (Il2CppCodeRegistration / MetadataRegistration) at runtime to map type names → TypeInfo/RVA → field
  offsets. Read-only.
- Resolve real-named anchors (`StageManager`, `Hero`, `Pet`, `StageInfoData`, `LocalInventoryManager`,
  `CommonSaveData`, `np<T>` singletons).
- Structural helper identification (never by random name): currency manager = static class with
  `List<T>@0x0` + `Dictionary<int,T>@0x8`, `T` has `ObscuredLong@0x28`; stage cache = static with
  `StageCache*@0x88`; etc.
- Emit an offset table matching the **Phase 1 shared schema**; cache to disk keyed by game version.
- Resolution order wiring: exact-version bundled → runtime self-heal → degraded banner; degrade (never
  mis-read) when anchors changed.
- Add a "game-update playbook" doc + release-checklist step (see below).

**Verification / done:** derive against the installed version and match the bundled table byte-for-byte
(offsets equal); simulate an unknown version (rename/remove the bundled table) → self-heal reads
correctly; corrupt an anchor → degrades. `pnpm qa` green; Verifier writes `validation.md`.

---

## Phase 4 — Follow-up live stats (split into small sub-PRs)

**Goal:** additive live data, each its own small branch/PR/session once the framework + extractor exist.

**Requirements:** LMR-20..24. Suggested sub-PRs (each independently shippable):
- `feat/live-memory-stage-times` — stage clear times + best-farm tracking (LMR-20).
- `feat/live-memory-party` — heroes + equipment + engravings/decorations/inscriptions (LMR-21).
- `feat/live-memory-hero-stats` — in-game hero stats, skill points, active skills (LMR-22).
- `feat/live-memory-dps` — estimated DPS (AD×AS), labeled estimate (LMR-23).
- `feat/live-memory-misc` — runes, cube level & tiers, steamtradeship (LMR-24).

**Entry reading:** `_research/live-memory/00-findings.md` feasibility table + POC probes under
`poc/memory-reader/src/offsets/` (`hero-runtime-probe`, `inventory-runtime-probe`, `stage-runtime-probe`,
`ui-runtime-probe`, `dps-readonly-probe`).

**Note on DPS:** only **estimated** DPS is possible read-only (no stable dealt-damage counter). Label it
as an estimate. Actual DPS is out of scope (would require hooking).

---

## Game-update playbook (lives here until Phase 3 formalizes it)

When the game patches and live reads break:
1. **First line (automatic once Phase 3 ships):** the runtime extractor re-derives offsets from anchors →
   most patches just work; users see nothing.
2. **If self-heal fails (anchors changed):** users see the degraded banner + save-file data (no wrong
   reads). Then: in `tbh-data`, dump the new build → re-derive the offset table → add it to the app's
   bundled tables → ship an app update. (Pre-Phase-3, this manual path is the *only* recovery.)
3. Update the bundled-offsets schema version if field shapes changed; keep bundled + extractor schema in
   sync.
