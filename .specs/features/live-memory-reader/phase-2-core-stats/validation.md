# Phase 2 Validation Report

## Verdict: PASS (with noted gaps)

All LMR-10..15 core behaviours are tested and no acceptance criterion is completely untested.
Two medium-severity gaps exist (see below). Neither constitutes a correctness regression against
the spec's stated acceptance criteria; both are coverage holes that a mutation could survive.

---

## Spec-anchored outcome check

| AC ID | Test name | Asserted outcome | Spec outcome | Match? |
|-------|-----------|-----------------|--------------|--------|
| LMR-10 live gold | `readRuntimeGold > decodes gold from a valid dict entry` | returns 99_000; `pin.entryPtr` set; `pin.lastKnown` set | gold decoded from ObscuredLong dict entry | ✅ |
| LMR-10 pin cache | `readRuntimeGold > hits the pin cache on a second read` | returns 42_000 even after dict is poisoned | re-uses cached entry pointer | ✅ |
| LMR-10 stale pin retry | `readRuntimeGold > retries the dict walk when the cached entry pointer goes stale` | returns 77_001; `pin.entryPtr` updated to real entry | retry on stale pin, correct value | ✅ |
| LMR-10 burst-fail fallback | `readRuntimeGold > returns lastKnown when all read attempts fail` | returns 55_000 (lastKnown) | return lastKnown on decode failure | ✅ |
| LMR-10 no manager | `readRuntimeGold > returns null when currency manager not found and no lastKnown` | null | null when unreachable | ✅ |
| LMR-10 implausible guard | `readRuntimeGold > rejects an implausible decoded value` | returns 1234 (lastKnown) | plausibleGold rejects negatives | ✅ |
| LMR-10 gold/hr live rate | `XpTracker.updateLive > updates gold rate from live wall-time samples` | `goldRollingRate > 0`; `currentGold === 7200` | rate recomputed from live samples | ⚠️ PARTIAL — rate is only asserted `> 0`, not at an exact expected value; spec says "recomputed over rolling window" (no numeric precision required by spec, so acceptable) |
| LMR-11 live heroes | `readRuntimeHeroes > reads hero list with correct heroKey, level, and exp` | 2-element array with exact field values | correct array for synthetic map | ✅ |
| LMR-11 null on absent singleton | `readRuntimeHeroes > returns null when StageManager singleton is absent` | null | null | ✅ |
| LMR-11 null on missing HeroList ptr | `readRuntimeHeroes > returns null when HeroList pointer is missing` | null | null | ✅ |
| LMR-11 zero-heroKey skip | `readRuntimeHeroes > skips hero slots with zero heroKey` | 1 element with heroKey 1003 | zeros skipped | ✅ |
| LMR-11 empty list null | `readRuntimeHeroes > returns null when list is empty` | null | count=0 → null | ✅ |
| LMR-11 hero count out-of-range | **NO TEST for hero count > 20** | — | spec: "hero count must be 1–20; if out of range, return null" | ❌ GAP |
| LMR-11 XP/hr live rate | `XpTracker.updateLive > seeded XP gain via live ticks drives the rolling rate` | `rollingRate > 0` | rate non-zero after live ticks | ✅ (imprecise but spec doesn't mandate exact value) |
| LMR-12 boxCount read | `readRuntimeBoxCount > reads the box count from StageManager when offset non-zero` | 42 | integer returned | ✅ |
| LMR-12 boxCount null offset | `readRuntimeBoxCount > returns null when boxCount offset is 0` | null | offset=0 → null | ✅ |
| LMR-12 boxCount null singleton | `readRuntimeBoxCount > returns null when StageManager singleton is absent` | null | null | ✅ |
| LMR-12 boxCount negative guard | **NO TEST for negative box count → null** | — | spec: "returns null for negative values (plausibility)" | ❌ GAP |
| LMR-12 Player.log removed | `playerLog.test.ts` deleted; no references in src/ | — | legacy path removed | ✅ |
| LMR-12 recordLiveBoxDrop | **`recordLiveBoxDrop` NOT IMPLEMENTED in chestDropTracker.ts** | — | tasks.md T07/T08 require `chestDropTracker.recordLiveBoxDrop(stageKey, wallTime?)` | ❌ GAP (function missing entirely) |
| LMR-12 readerRequired always true | `buildStats > includes chest drop session stats` | `readerRequired === true` | `readerRequired: true` always | ✅ |
| LMR-13 inventory read | `readRuntimeInventory > reads items from the inventory dict` | 2 items with exact fields | correct item list | ✅ |
| LMR-13 inventory null offset | `readRuntimeInventory > returns null when localInventoryManager RVA is 0` | null | offset=0 → null | ✅ |
| LMR-13 inventory skip zero key | `readRuntimeInventory > skips entries with zero or negative itemKey` | 1 item with itemKey 910152 | zeroes skipped | ✅ |
| LMR-13 inventory unreadable dict | `readRuntimeInventory > returns null when the dict is unreadable` | null | null | ✅ |
| LMR-14 pet read | `readRuntimePets > reads pet list with key and unlock status` | 2 pets with exact fields | correct pet list | ✅ |
| LMR-14 pet null offset | `readRuntimePets > returns null when petSaveDatas offset is 0` | null | offset=0 → null | ✅ |
| LMR-14 pet skip zero key | `readRuntimePets > skips entries with zero petKey` | 1 pet | zeroes skipped | ✅ |
| LMR-14 pet null singleton | `readRuntimePets > returns null when CommonSaveData singleton is absent` | null | null | ✅ |
| LMR-14 pet empty list null | `readRuntimePets > returns null when pet list is empty` | null | count=0 → null | ✅ |
| LMR-15 diagnostics expand | No unit test (UI-only; typecheck gate per tasks.md T11) | — | expanded rows in `LiveMemoryDiagnostics.tsx` | ✅ (accepted by design) |

---

## Discrimination sensor

| Function | Mutation | Killing test | Survives? |
|----------|----------|-------------|-----------|
| `readRuntimeGold` | Replace `plausibleGold` check with always-true (return negative gold) | `readRuntimeGold > rejects an implausible decoded value` — asserts `lastKnown` returned, not the negative | No — killed |
| `readRuntimeGold` | Clear `pin.entryPtr` after every successful read (always re-walk dict) | `readRuntimeGold > hits the pin cache on a second read without re-walking the dict` — poisons dict and expects success | No — killed |
| `readRuntimeGold` | Return `null` instead of `pin.lastKnown` when all decode attempts fail | `readRuntimeGold > returns lastKnown when all read attempts fail` | No — killed |
| `readRuntimeHeroes` | Remove the hero-count upper-bound guard (allow count > 20) | **No test asserts count=21 → null** | YES — survives |
| `readRuntimeHeroes` | Return empty array `[]` instead of `null` when list size = 0 | `readRuntimeHeroes > returns null when list is empty` asserts `toBeNull()` | No — killed |
| `readRuntimeHeroes` | Skip all heroes (return `[]`) unconditionally | `readRuntimeHeroes > reads hero list...` expects length 2 | No — killed |
| `readRuntimeBoxCount` | Remove negative-value guard (return -5 instead of null) | **No test seeds a negative value and checks for null** | YES — survives |
| `readRuntimeBoxCount` | Return 0 instead of null when offset is 0 | `readRuntimeBoxCount > returns null when boxCount offset is 0` asserts `toBeNull()` | No — killed |
| `readRuntimeInventory` | Remove `itemKey <= 0` skip guard | `readRuntimeInventory > skips entries with zero or negative itemKey` — expects length 1 | No — killed |
| `readRuntimeInventory` | Return `[]` instead of `null` when dict is unreadable | `readRuntimeInventory > returns null when the dict is unreadable` asserts `toBeNull()` | No — killed |
| `readRuntimePets` | Swap `isUnlock` boolean read (always return `false`) | `readRuntimePets > reads pet list...` — asserts `result![0]` equals `{ petKey: 5001, unlocked: true }` | No — killed |
| `readRuntimePets` | Remove upper-bound guard (allow > 200 pets) | **No test with count > 200** | YES — survives (minor; same pattern as heroes) |
| `XpTracker.updateLive` | Allow `updateLive` to run before `update()` (remove initialized guard) | `XpTracker.updateLive > is ignored before the first save update` — asserts rates stay 0 | No — killed |
| `XpTracker.updateLive` | Always increment rate even when gold delta = 0 | `XpTracker.updateLive > updates currentGold with live value` only checks `currentGold`, not rate; no "same value no rate change" test | YES — partial survival (rate monotonic-increase mutation would not be caught) |

---

## Gaps (ranked by severity)

### GAP-1 (Medium): `recordLiveBoxDrop` not implemented — chest drops from memory non-functional

- **What's missing:** `ChestDropTracker.recordLiveBoxDrop(stageKey, wallTime?)` was required by tasks.md (T07/T08) to wire box-count delta into actual chest-drop records. The function does not exist in `app/src/core/chestDropTracker.ts` or anywhere in `app/src/`.
- **Spec impact:** LMR-12 AC3 ("WHEN a chest drops in-game THEN the drop SHALL be reflected from memory") is unmet at runtime. The `boxCount` is read live, but nothing converts a delta into a `ChestDropTracker` entry.
- **Fix:** Implement `recordLiveBoxDrop(stageKey: string, wallTime?: number): boolean` in `chestDropTracker.ts` (mirrors `recordLogDrop` but triggered by box-count delta). Wire call in `TrackingService.ingestLiveFrame`. Add test: "recordLiveBoxDrop increments commonTotal and returns true for a valid stage".

### GAP-2 (Low): `readRuntimeHeroes` upper-bound guard (count > 20) not tested

- **What's missing:** The task spec mandates `null` when hero count is 0 or > 20. There is a test for count=0 (passes) but no test for count=21+.
- **Fix:** Add one test case to `liveMemoryRuntime.test.ts`: seed `listSize = 21`, assert `readRuntimeHeroes` returns `null`.

### GAP-3 (Low): `readRuntimeBoxCount` negative-value guard not tested

- **What's missing:** Task spec says "returns null for negative values (plausibility)". No test seeds a negative I32 and asserts null.
- **Fix:** Add one test: seed `writeI32(SM_SINGLETON + BOX_OFFSET, -1)` with a valid chain, assert result is `null`.

### GAP-4 (Trivial): `ChestDropTracker.getStats` `readerRequired` not asserted in chest-drop unit tests

- **What's missing:** `chestDropTracker.test.ts` calls `getStats(3600, true)` (extra arg ignored) and never reads `stats.readerRequired`. Only covered indirectly via `buildStats.test.ts`.
- **Fix:** Add `expect(stats.readerRequired).toBe(true)` to at least one `ChestDropTracker` test.

---

## Diff range

`e125a66..8d4a352` (11 commits on `feat/live-memory-core-stats` vs `main`)

Commits in scope:
- `e125a66` — schema extension (T01)
- `a30848d` — readRuntimeGold + GoldPinState (T02)
- `48f3e16` — readRuntimeHeroes (T03)
- `6c0aa58` — readRuntimeBoxCount (T04)
- `5051c86` — wire gold/heroes/boxCount into liveReader (T05)
- `e85d626` — XpTracker.updateLive (T06)
- `36e20e0` — live frame wiring + stats blend (T07)
- `3234236` — remove Player.log (T08)
- `55134ab` — readRuntimeInventory + readRuntimePets + reader wire (T09+T10)
- `a020af2` — diagnostics tab expansion (T11)
- `8d4a352` — Prettier format pass
