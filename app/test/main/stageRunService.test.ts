import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

vi.mock("electron", () => ({
  app: {
    getPath: () => userDataDir,
    isPackaged: false,
  },
  BrowserWindow: {
    getAllWindows: () => [],
  },
}));

vi.mock("../../src/main/log", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("../../src/main/services/broadcast", () => ({
  broadcast: vi.fn(),
}));

let userDataDir = "";

describe("StageRunService", () => {
  beforeEach(() => {
    userDataDir = mkdtempSync(join(tmpdir(), "tbh-stage-runs-"));
    vi.resetModules();
  });

  afterEach(() => {
    rmSync(userDataDir, { recursive: true, force: true });
  });

  async function loadService() {
    const { StageRunService } = await import("../../src/main/services/StageRunService");
    return new StageRunService();
  }

  it("starts with no rows on first run", async () => {
    const svc = await loadService();
    expect(svc.getStats().rows).toEqual([]);
  });

  it("records a clear and reports it via getStats", async () => {
    const svc = await loadService();
    expect(svc.recordClear(2305, 85)).toBe(true);

    const stats = svc.getStats();
    expect(stats.rows).toEqual([
      { stageKey: 2305, bestClearTimeSec: 85, lastClearTimeSec: 85, clearCount: 1 },
    ]);
  });

  it("persists best times to disk and reloads them on next construction", async () => {
    const first = await loadService();
    first.recordClear(2305, 85);
    first.recordClear(2305, 63);

    const raw = JSON.parse(readFileSync(join(userDataDir, "stage_run_best.json"), "utf-8"));
    expect(raw.bestByStageKey["2305"]).toBe(63);

    vi.resetModules();
    const second = await loadService();
    expect(second.getStats().rows[0]).toEqual({
      stageKey: 2305,
      bestClearTimeSec: 63,
      lastClearTimeSec: 63,
      clearCount: 2,
    });
  });

  it("resetStorage clears in-memory best times", async () => {
    const svc = await loadService();
    svc.recordClear(2305, 85);
    svc.resetStorage();
    expect(svc.getStats().rows).toEqual([]);
  });
});
