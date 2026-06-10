import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

vi.mock("electron", () => ({
  app: {
    getPath: () => userDataDir,
  },
  BrowserWindow: {
    getAllWindows: () => [],
  },
}));

let userDataDir = "";

describe("BoxTimerService", () => {
  beforeEach(() => {
    userDataDir = mkdtempSync(join(tmpdir(), "tbh-box-timers-"));
  });

  afterEach(() => {
    rmSync(userDataDir, { recursive: true, force: true });
  });

  async function loadService() {
    vi.resetModules();
    const { BoxTimerService } = await import("../../src/main/services/BoxTimerService");
    return new BoxTimerService();
  }

  it("defaults to four mid-game route boxes on first run", async () => {
    const svc = await loadService();
    const state = svc.getState();
    expect(state.enabledCount).toBe(4);
    expect(state.rows).toHaveLength(4);
    expect(state.catalog).toHaveLength(14);
  });

  it("toggles enabled boxes and persists selection", async () => {
    const svc = await loadService();
    const enabled = svc.getState().rows.map((r) => r.boxId);
    svc.setEnabledBoxIds(enabled.filter((id) => id !== 920151));
    expect(svc.getState().enabledCount).toBe(3);

    const svc2 = await loadService();
    expect(svc2.getState().enabledCount).toBe(3);

    const raw = JSON.parse(readFileSync(join(userDataDir, "box_timers.json"), "utf-8")) as {
      enabledBoxIds: number[];
    };
    expect(raw.enabledBoxIds).not.toContain(920151);
  });

  it("replaces selection with setEnabledBoxIds", async () => {
    const svc = await loadService();
    svc.setEnabledBoxIds([920001, 920002]);
    expect(svc.getState().enabledCount).toBe(2);
    expect(svc.getState().rows.map((r) => r.boxId)).toEqual([920001, 920002]);
  });

  it("marks dropped boxes as cooldown then ready after clear", async () => {
    const svc = await loadService();
    svc.markDropped(920151);
    expect(svc.getState().rows.find((r) => r.boxId === 920151)?.status).toBe("cooldown");

    svc.clearTimer(920151);
    expect(svc.getState().rows.find((r) => r.boxId === 920151)?.status).toBe("ready");
  });
});
