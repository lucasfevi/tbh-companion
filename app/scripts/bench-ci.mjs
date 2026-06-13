#!/usr/bin/env node
/**
 * Run performance benchmarks and emit JSON for CI trend tracking.
 * Never fails the process — results are informational only.
 *
 * Usage (from app/):
 *   npm run bench:ci
 *   npm run bench:ci -- --update-baseline
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(appRoot, "..");
const resultsPath = join(appRoot, "bench-results.json");
const baselinePath = join(repoRoot, "bench", "baseline.json");
const vitestPath = join(appRoot, "node_modules", "vitest", "vitest.mjs");
const updateBaseline = process.argv.includes("--update-baseline");

function runBenchmarks() {
  const outputFile = "bench-results.json";
  const result = spawnSync(
    process.execPath,
    [
      vitestPath,
      "bench",
      "--config",
      "vitest.bench.config.ts",
      "--run",
      "--outputJson",
      outputFile,
    ],
    {
      cwd: appRoot,
      encoding: "utf-8",
      env: { ...process.env, FORCE_COLOR: "0" },
      windowsHide: true,
    },
  );

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status !== 0) {
    console.warn(`\n[bench:ci] vitest bench exited with code ${result.status ?? "unknown"}`);
  }

  if (!existsSync(resultsPath)) {
    console.warn("\n[bench:ci] No benchmark output file produced.");
    return null;
  }

  return JSON.parse(readFileSync(resultsPath, "utf-8"));
}

function normalizeResults(raw) {
  const results = {};

  for (const file of raw?.files ?? []) {
    for (const group of file?.groups ?? []) {
      const groupName = group.fullName ?? "";
      for (const entry of group?.benchmarks ?? []) {
        const shortName = entry.name ?? "unknown";
        const name = groupName ? `${groupName} > ${shortName}` : shortName;
        if (entry.median == null && entry.mean == null) continue;
        results[name] = {
          medianMs: roundMs(entry.median ?? entry.mean),
          p95Ms: entry.p995 != null ? roundMs(entry.p995) : undefined,
          p99Ms: entry.p99 != null ? roundMs(entry.p99) : undefined,
          meanMs: entry.mean != null ? roundMs(entry.mean) : undefined,
          hz: entry.hz != null ? roundHz(entry.hz) : undefined,
        };
      }
    }
  }

  return results;
}

function roundMs(value) {
  const number = Number(value);
  if (number < 1) return Math.round(number * 10000) / 10000;
  return Math.round(number * 100) / 100;
}

function roundHz(value) {
  return Math.round(Number(value) * 100) / 100;
}

function compareToBaseline(current, baseline) {
  if (!baseline?.results) return;
  console.log("\n[bench:ci] Delta vs baseline:");
  for (const [name, stats] of Object.entries(current.results)) {
    const base = baseline.results[name];
    if (!base?.medianMs) {
      console.log(`  ${name}: (new)`);
      continue;
    }
    const delta = stats.medianMs - base.medianMs;
    const pct = ((delta / base.medianMs) * 100).toFixed(1);
    const sign = delta >= 0 ? "+" : "";
    console.log(`  ${name}: ${sign}${delta.toFixed(2)}ms (${sign}${pct}%)`);
  }
}

const raw = runBenchmarks();
if (!raw) {
  process.exit(0);
}

const envelope = {
  runAt: new Date().toISOString(),
  nodeVersion: process.version,
  commit: process.env.GITHUB_SHA ?? null,
  results: normalizeResults(raw),
};

writeFileSync(resultsPath, `${JSON.stringify(envelope, null, 2)}\n`, "utf-8");
console.log(
  `\n[bench:ci] Wrote ${resultsPath} (${Object.keys(envelope.results).length} benchmarks)`,
);

if (existsSync(baselinePath)) {
  const baseline = JSON.parse(readFileSync(baselinePath, "utf-8"));
  compareToBaseline(envelope, baseline);
} else {
  console.log(`\n[bench:ci] No baseline at ${baselinePath}`);
}

if (updateBaseline) {
  mkdirSync(dirname(baselinePath), { recursive: true });
  writeFileSync(baselinePath, `${JSON.stringify(envelope, null, 2)}\n`, "utf-8");
  console.log(`[bench:ci] Updated baseline at ${baselinePath}`);
}

process.exit(0);
