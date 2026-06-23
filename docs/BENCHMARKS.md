# Performance benchmarks

Headless Node.js benchmarks measure latency on the companion's critical data path. They establish a baseline before heavier features (Farming Analyzer, Gear Comparator) and help catch regressions early.

Benchmarks are **informational only** — they do not pass or fail CI.

## What is measured

| Benchmark | What it covers |
|-----------|----------------|
| **ES3 decrypt** | `decryptToText` on a synthetic 1500-item save |
| **Save parse** | `parseSnapshot` on the same payload |
| **Inventory parse** | `parseInventory` |
| **Inventory resolve** | `resolveInventory` with bundled catalog + 10% mock prices |
| **Startup proxy** | Bundled gamedata index load + full save pipeline (decrypt → parse → resolve) |
| **Steam refresh (cached)** | `SteamMarketProvider.refresh` when all targets are already fresh (noop path) |
| **Lookup filter/sort** | `filterAndSortItems` on the full ~1500-item catalog: no filters, query-only, multi-select, combined filter+sort |

Full Electron window startup is **not** benchmarked in CI (too flaky on headless runners). The startup proxy covers the synchronous main-process work in `startTracking()` and the first save read pipeline.

## Running locally

From `app/`:

```powershell
cd app
npm run bench          # interactive vitest bench output
npm run bench:ci       # JSON report + delta vs baseline
```

Update the committed baseline after intentional performance changes:

```powershell
cd app
npm run bench:ci -- --update-baseline
```

Then commit [`bench/baseline.json`](../bench/baseline.json).

### Optional: real save benchmarks

When your live save file is present, set `TBH_BENCH_SAVE_PATH` to run additional benches (skipped by default):

```powershell
$env:TBH_BENCH_SAVE_PATH = "$env:USERPROFILE\AppData\LocalLow\TesseractStudio\TaskbarHero\SaveFile_Live.es3"
npm run bench
```

Never commit `.es3` files or baseline updates derived from personal saves.

## File layout

```
app/test/bench/
  fixtures/           # synthetic save builder, ES3 encrypt helper, catalog loader
  *.bench.ts          # vitest bench suites
  realSave.bench.ts   # optional local-only (describe.skip when path missing)
app/vitest.bench.config.ts
app/scripts/bench-ci.mjs
bench/baseline.json   # committed median timings (repo root)
```

## CI

[`.github/workflows/benchmark.yml`](../.github/workflows/benchmark.yml) runs on push to `main` and on manual dispatch:

1. Runs `npm run bench:ci` on Ubuntu
2. Uploads `app/bench-results.json` as a workflow artifact (90-day retention)
3. Prints deltas vs `bench/baseline.json`
4. Uses `continue-on-error: true` — never blocks merges

PR benchmark comment bots are deferred; compare artifacts manually or run `npm run bench:ci` locally before large perf-sensitive changes.

## Interpreting results

- Timings are in **milliseconds** (median / p95).
- CI runners vary — compare trends over time, not absolute numbers across machines.
- Synthetic saves use 1500 tradable items sampled from `data/gamedata.json`.
- Steam cold-fetch (network + rate-limit delays) is covered by unit tests in `test/main/steamMarketProvider.test.ts`, not timed benchmarks.

## Adding a new benchmark

1. Add `app/test/bench/<name>.bench.ts` using vitest's `bench()` API.
2. Prefer module-level fixture setup (not `beforeAll`) — vitest bench collects stats reliably that way.
3. Keep benchmarks headless (no Electron window).
4. Run `npm run bench:ci -- --update-baseline` if the new benchmark should appear in CI deltas.

See also: [`AGENTS.md`](../AGENTS.md) (Build / run / test), [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) (data flow).
