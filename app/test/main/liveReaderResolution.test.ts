// Tests for LiveMemoryReader.attach() resolution order:
// bundled → disk cache → runtime extractor → degraded (never wrong reads).
// Uses vi.mock to stub all three resolution paths independently.

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LiveOffsets } from "../../src/core/liveMemory/offsets";

// ── Stubs ─────────────────────────────────────────────────────────────────────

const FAKE_VERSION = "2.00.00"; // not in bundled table → forces cache / extractor path
const FAKE_OFFSETS: Partial<LiveOffsets> = { gameVersion: FAKE_VERSION } as LiveOffsets;

// Hoisted mutable state so we can control each stub per test.
const stubs = vi.hoisted(() => ({
  offsetsForVersion: null as LiveOffsets | null,
  loadCachedOffsets: null as LiveOffsets | null,
  saveCachedOffsetsCalled: false,
  extractOffsets: null as LiveOffsets | null,
  procAlive: true,
  procModules: [
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
}));

vi.mock("../../src/core/liveMemory/offsets", () => ({
  offsetsForVersion: () => stubs.offsetsForVersion,
  supportedVersions: () => [],
}));

vi.mock("../../src/main/liveMemory/offsetCache", () => ({
  loadCachedOffsets: () => stubs.loadCachedOffsets,
  saveCachedOffsets: () => {
    stubs.saveCachedOffsetsCalled = true;
  },
  offsetCachePath: () => "/fake/path",
}));

vi.mock("../../src/main/liveMemory/offsetExtractor", () => ({
  extractOffsets: () => stubs.extractOffsets,
}));

vi.mock("node:fs", () => ({
  existsSync: () => true,
  readFileSync: () => FAKE_VERSION,
}));

vi.mock("node:path", async () => {
  const nodePath = await import("node:path");
  return { ...nodePath, dirname: () => "C:\\game", join: (...p: string[]) => p.join("\\") };
});

vi.mock("../../src/main/liveMemory/winProcess", () => ({
  WinProcess: {
    findByNames: () => ({
      pid: 9999,
      isAlive: () => stubs.procAlive,
      close: () => undefined,
      listModules: () => stubs.procModules,
      readBytes: () => null,
    }),
  },
}));

// ── Helper: fresh reader per test ─────────────────────────────────────────────

async function freshReader() {
  vi.resetModules();
  const { LiveMemoryReader } = await import("../../src/main/liveMemory/liveReader");
  return new LiveMemoryReader();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("LiveMemoryReader.attach() resolution order", () => {
  beforeEach(() => {
    stubs.offsetsForVersion = null;
    stubs.loadCachedOffsets = null;
    stubs.saveCachedOffsetsCalled = false;
    stubs.extractOffsets = null;
    stubs.procAlive = true;
  });

  it("uses bundled offsets when offsetsForVersion returns non-null", async () => {
    stubs.offsetsForVersion = FAKE_OFFSETS as LiveOffsets;
    const reader = await freshReader();
    reader.attach();
    expect(reader.supported).toBe(true);
    expect(reader.gameVersion).toBe(FAKE_VERSION);
  });

  it("falls through to disk cache when bundled returns null, and uses cached offsets", async () => {
    stubs.offsetsForVersion = null;
    stubs.loadCachedOffsets = FAKE_OFFSETS as LiveOffsets;
    const reader = await freshReader();
    reader.attach();
    expect(reader.supported).toBe(true);
  });

  it("calls extractor when bundled and cache both return null", async () => {
    stubs.offsetsForVersion = null;
    stubs.loadCachedOffsets = null;
    stubs.extractOffsets = FAKE_OFFSETS as LiveOffsets;
    const reader = await freshReader();
    reader.attach();
    expect(reader.supported).toBe(true);
  });

  it("saves to cache when extractor succeeds", async () => {
    stubs.offsetsForVersion = null;
    stubs.loadCachedOffsets = null;
    stubs.extractOffsets = FAKE_OFFSETS as LiveOffsets;
    const reader = await freshReader();
    reader.attach();
    expect(stubs.saveCachedOffsetsCalled).toBe(true);
  });

  it("enters degraded mode (supported=false) when all three return null", async () => {
    stubs.offsetsForVersion = null;
    stubs.loadCachedOffsets = null;
    stubs.extractOffsets = null;
    const reader = await freshReader();
    reader.attach();
    expect(reader.supported).toBe(false);
    expect(reader.attached).toBe(true); // attached but unsupported
  });
});
