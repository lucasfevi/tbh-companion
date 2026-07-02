// Tests for the self-healing offset resolution in LiveMemoryReader.attach():
//   seed (bundled/cache) → completeness check → attempt-capped extract + merge.
// The completeness/merge helpers run for real; only the impure edges are mocked.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { offsetsForVersion, type LiveOffsets } from "../../src/core/liveMemory/offsets";

// A game version NOT in the bundled table, so offsetsForVersion() returns null
// naturally and resolution falls to the cache/extractor mocks.
const VERSION = "9.99.99";

// Real v1.00.21 table, re-versioned. As-is it is complete-critical but missing
// the enrichment `logManager` RVA (0n) → isOffsetTableComplete === false.
const INCOMPLETE: LiveOffsets = { ...offsetsForVersion("1.00.21")!, gameVersion: VERSION };
// Same table with the last gap filled → fully complete.
const COMPLETE: LiveOffsets = {
  ...INCOMPLETE,
  typeInfoRva: { ...INCOMPLETE.typeInfoRva, logManager: 0x5e40000n },
};
// What the extractor "derives": only the missing enrichment RVA.
const DERIVED: LiveOffsets = {
  ...INCOMPLETE,
  typeInfoRva: { ...INCOMPLETE.typeInfoRva, logManager: 0x5e40000n },
};

const stubs = vi.hoisted(() => ({
  cached: null as LiveOffsets | null,
  extracted: null as LiveOffsets | null,
  mayAttempt: true,
  saved: null as LiveOffsets | null,
  extractCalls: 0,
  recordCalls: 0,
}));

vi.mock("../../src/main/liveMemory/offsetCache", () => ({
  loadCachedOffsets: () => stubs.cached,
  saveCachedOffsets: (_dir: string, offsets: LiveOffsets) => {
    stubs.saved = offsets;
  },
  offsetCachePath: () => "/fake/path",
}));

vi.mock("../../src/main/liveMemory/offsetExtractor", () => ({
  extractOffsets: () => {
    stubs.extractCalls += 1;
    return stubs.extracted;
  },
}));

vi.mock("../../src/main/liveMemory/offsetHealing", () => ({
  mayAttemptExtraction: () => stubs.mayAttempt,
  recordExtractionAttempt: () => {
    stubs.recordCalls += 1;
  },
  extractionAttempts: () => (stubs.mayAttempt ? 0 : 3),
}));

vi.mock("node:fs", () => ({
  existsSync: () => true,
  readFileSync: () => VERSION,
}));

vi.mock("node:path", async () => {
  const nodePath = await import("node:path");
  return { ...nodePath, dirname: () => "C:\\game", join: (...p: string[]) => p.join("\\") };
});

vi.mock("../../src/main/liveMemory/winProcess", () => ({
  WinProcess: {
    findByNames: () => ({
      pid: 9999,
      isAlive: () => true,
      close: () => undefined,
      listModules: () => [
        {
          name: "GameAssembly.dll",
          baseAddress: 0x140000000n,
          size: 0x6000000,
          path: "C:\\game\\GameAssembly.dll",
        },
        {
          name: "TaskBarHero.exe",
          baseAddress: 0x400000n,
          size: 0x1000,
          path: "C:\\game\\TaskBarHero.exe",
        },
      ],
      readBytes: () => null,
    }),
  },
}));

async function attachFresh() {
  vi.resetModules();
  const { LiveMemoryReader } = await import("../../src/main/liveMemory/liveReader");
  const reader = new LiveMemoryReader();
  reader.attach("test-build");
  return reader;
}

beforeEach(() => {
  stubs.cached = null;
  stubs.extracted = null;
  stubs.mayAttempt = true;
  stubs.saved = null;
  stubs.extractCalls = 0;
  stubs.recordCalls = 0;
});

describe("LiveMemoryReader self-healing resolution", () => {
  it("skips extraction when the cached table is already complete", async () => {
    stubs.cached = COMPLETE;
    const reader = await attachFresh();
    expect(stubs.extractCalls).toBe(0);
    expect(reader.supported).toBe(true);
  });

  it("runs the extractor and merges when the cached table is incomplete", async () => {
    stubs.cached = INCOMPLETE; // logManager 0n
    stubs.extracted = DERIVED;
    const reader = await attachFresh();
    expect(stubs.extractCalls).toBe(1);
    // Merged table persisted with the derived gap filled.
    expect(stubs.saved?.typeInfoRva.logManager).toBe(0x5e40000n);
    expect(reader.supported).toBe(true);
  });

  it("records an attempt before extracting", async () => {
    stubs.cached = INCOMPLETE;
    stubs.extracted = DERIVED;
    await attachFresh();
    expect(stubs.recordCalls).toBe(1);
  });

  it("keeps a base value over the derived one when merging (fills only gaps)", async () => {
    stubs.cached = INCOMPLETE;
    // Extractor returns a DIFFERENT heroList — merge must keep the base's value.
    stubs.extracted = {
      ...DERIVED,
      runtime: { ...DERIVED.runtime, heroList: 0x999 },
    };
    await attachFresh();
    expect(stubs.saved?.runtime.heroList).toBe(INCOMPLETE.runtime.heroList);
  });

  it("skips extraction when the attempt budget is exhausted", async () => {
    stubs.cached = INCOMPLETE;
    stubs.mayAttempt = false;
    const reader = await attachFresh();
    expect(stubs.extractCalls).toBe(0);
    expect(stubs.saved).toBeNull();
    // Still supported: the critical fields are present even without enrichment.
    expect(reader.supported).toBe(true);
  });

  it("degrades (supported=false) when nothing resolves and extraction fails", async () => {
    stubs.cached = null;
    stubs.extracted = null;
    const reader = await attachFresh();
    expect(reader.supported).toBe(false);
    expect(reader.attached).toBe(true);
  });
});
