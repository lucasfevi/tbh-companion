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

  it("starts with no history on first run", async () => {
    const svc = await loadService();
    expect(svc.getStats().history).toEqual([]);
  });

  it("records a clear and reports it via getStats", async () => {
    const svc = await loadService();
    svc.recordClear(2305, 85, 400, 12_000);

    const stats = svc.getStats();
    expect(stats.history).toHaveLength(1);
    expect(stats.history[0]).toMatchObject({
      stageKey: 2305,
      clearTimeSec: 85,
      xpGained: 400,
      goldGained: 12_000,
    });
  });

  it("persists history to disk and reloads it on next construction", async () => {
    const first = await loadService();
    first.recordClear(2305, 85, 400, 12_000);
    first.recordClear(2305, 63, 500, 15_000);

    const raw = JSON.parse(readFileSync(join(userDataDir, "stage_run_history.json"), "utf-8"));
    expect(raw.history).toHaveLength(2);

    vi.resetModules();
    const second = await loadService();
    expect(second.getStats().history).toHaveLength(2);
    expect(second.getStats().history[0]).toMatchObject({ clearTimeSec: 63, xpGained: 500 });
  });

  it("resetStorage clears in-memory history", async () => {
    const svc = await loadService();
    svc.recordClear(2305, 85, 400, 12_000);
    svc.resetStorage();
    expect(svc.getStats().history).toEqual([]);
  });
});
