import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { IPC, IPC_INVOKE_CHANNELS, IPC_PUSH_CHANNELS, IPC_SEND_CHANNELS } from "../../shared/ipc";

describe("IPC channel registry", () => {
  it("preload uses every invoke channel via IPC constants", () => {
    const preload = readFileSync(join(__dirname, "../../src/preload/index.ts"), "utf-8");
    expect(preload).toContain("IPC.GET_STATS");
    expect(preload).toContain("IPC.GET_INVENTORY");
    expect(preload).toContain("IPC.SAVE_CONFIG");
    expect(preload).toContain("IPC.PRICES_REFRESH");
  });

  it("registerIpc wires invoke handlers", () => {
    const reg = readFileSync(join(__dirname, "../../src/main/ipc/registerIpc.ts"), "utf-8");
    expect(reg).toContain("IPC.GET_STATS");
    expect(reg).toContain("IPC.SAVE_CONFIG");
    expect(reg).toContain("IPC.PRICES_REFRESH");
  });

  it("appState pushes on IPC constants", () => {
    const state = readFileSync(join(__dirname, "../../src/main/app/appState.ts"), "utf-8");
    expect(state).toContain("IPC.STATS");
    expect(state).toContain("IPC.INVENTORY");
    expect(state).toContain("IPC.PRICES_PROGRESS");
  });

  it("preload uses send channels via IPC constants", () => {
    const preload = readFileSync(join(__dirname, "../../src/preload/index.ts"), "utf-8");
    expect(preload).toContain("IPC.RESET");
    expect(preload).toContain("IPC.OPEN_OVERLAY");
    expect(preload).toContain("IPC.PRICES_CANCEL");
  });

  it("push channel strings are unique", () => {
    const all = [...IPC_INVOKE_CHANNELS, ...IPC_SEND_CHANNELS, ...IPC_PUSH_CHANNELS];
    expect(new Set(all).size).toBe(all.length);
  });
});
