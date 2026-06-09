# Refactor plan

Working app today; goal is maintainability, testability, and room to grow. **Phase 1 started overnight (uncommitted).**

## Pain points

- `main/index.ts` ~550 lines: bootstrap, globals, IPC, windows, inventory/pricing orchestration
- IPC channel strings duplicated in main + preload
- `core/saveReader.ts` uses `node:fs` (violates “pure core” intent)
- Duplicate types (`Config` vs `AppConfig`, local `GameDataStatus`)
- Renderer filter logic in `Inventory.tsx` untested

## Target structure

See `AGENTS.md` → **Architecture & refactor conventions**.

```
app/shared/     types.ts, ipc.ts (channel constants)
app/src/core/   pure logic only — no fs, electron, fetch
app/src/main/   io/, services/, ipc/handlers/, windows/, app/
app/src/renderer/  tabs thin; lib/ + components/ for logic/UI split
app/test/       core/, main/, ipc/, fixtures/
```

## Phases

| Phase | Scope | Status |
|-------|--------|--------|
| **1** | `shared/ipc.ts`, extract windows + lifecycle + `registerIpc`, slim `index.ts` | Done (uncommitted) |
| **2** | `AppState`, `TrackingService`, `InventoryService`, split IPC handlers | Planned |
| **3** | Move fs out of core; split `inventory.ts`; unified config type | Planned |
| **4** | Extract Inventory UI helpers + components; slim `SteamMarketProvider` | Planned |

## Testing targets

| Domain | Must cover |
|--------|------------|
| Inventory | parse, resolve, ownedMarketNames, location math |
| Pricing | parseMoney, pickMarketUnit, 429 backoff, cache TTL |
| Save | parseSnapshot, watcher mtime, read retry |
| IPC | channel parity main ↔ preload ↔ `TbhApi` |
| Config | patch side effects (watcher restart, currency refresh, CSV toggle) |

Extend `realSave.test.ts` when save present: inventory resolve smoke test.

## Exit criteria (whole refactor)

- `index.ts` < 80 lines
- No `node:fs` under `core/`
- All IPC channels in `shared/ipc.ts`
- Config/currency/CSV bugs covered by tests
- `npm test` + `typecheck` + `build` green

**Do not merge until reviewed** — overnight work is uncommitted per request.
