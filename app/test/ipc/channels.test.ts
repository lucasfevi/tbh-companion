import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { IPC_INVOKE_CHANNELS, IPC_PUSH_CHANNELS, IPC_SEND_CHANNELS } from "../../shared/ipc";

function readHandler(name: string): string {
  return readFileSync(join(__dirname, `../../src/main/ipc/handlers/${name}.ts`), "utf-8");
}

describe("IPC channel registry", () => {
  it("preload uses every invoke channel via IPC constants", () => {
    const preload = readFileSync(join(__dirname, "../../src/preload/index.ts"), "utf-8");
    expect(preload).toContain("IPC.GET_STATS");
    expect(preload).toContain("IPC.GET_INVENTORY");
    expect(preload).toContain("IPC.GET_CHESTS");
    expect(preload).toContain("IPC.GET_PETS");
    expect(preload).toContain("IPC.GET_BOX_TIMERS");
    expect(preload).toContain("IPC.SET_BOX_TRACKER_BOXES");
    expect(preload).toContain("IPC.SET_BOX_TRACKER_COOLDOWN");
    expect(preload).toContain("IPC.CLEAR_BOX_TRACKER_COOLDOWN");
    expect(preload).toContain("IPC.SET_BOX_TRACKER_FARM_STAGE");
    expect(preload).toContain("IPC.CLEAR_BOX_TRACKER_FARM_STAGE");
    expect(preload).toContain("IPC.SAVE_CONFIG");
    expect(preload).toContain("IPC.PICK_SAVE_FILE");
    expect(preload).toContain("IPC.PRICES_REFRESH");
    expect(preload).toContain("IPC.GET_DATA_PATHS");
    expect(preload).toContain("IPC.CLEAR_APP_DATA");
    expect(preload).toContain("IPC.CLEAR_DIAGNOSTIC_LOGS");
    expect(preload).toContain("IPC.LOG_RENDERER_ERROR");
    expect(preload).toContain("IPC.GET_UPDATE_STATUS");
    expect(preload).toContain("IPC.UPDATE_CHECK");
    expect(preload).toContain("IPC.UPDATE_DOWNLOAD");
    expect(preload).toContain("IPC.UPDATE_QUIT_AND_INSTALL");
  });

  it("IPC handlers wire invoke and send channels", () => {
    const stats = readHandler("stats");
    const market = readHandler("market");
    const config = readHandler("config");
    const data = readHandler("data");
    expect(stats).toContain("IPC.GET_STATS");
    expect(config).toContain("IPC.SAVE_CONFIG");
    expect(config).toContain("IPC.PICK_SAVE_FILE");
    expect(market).toContain("IPC.PRICES_REFRESH");
    expect(data).toContain("IPC.GET_DATA_PATHS");
    expect(data).toContain("IPC.CLEAR_APP_DATA");
    const logHandler = readFileSync(join(__dirname, "../../src/main/ipc/handlers/log.ts"), "utf-8");
    expect(logHandler).toContain("IPC.CLEAR_DIAGNOSTIC_LOGS");
    expect(logHandler).toContain("IPC.LOG_RENDERER_ERROR");
    const updateHandler = readFileSync(
      join(__dirname, "../../src/main/ipc/handlers/update.ts"),
      "utf-8",
    );
    expect(updateHandler).toContain("IPC.GET_UPDATE_STATUS");
    expect(updateHandler).toContain("IPC.UPDATE_CHECK");
    expect(updateHandler).toContain("IPC.UPDATE_DOWNLOAD");
    expect(updateHandler).toContain("IPC.UPDATE_QUIT_AND_INSTALL");
  });

  it("services broadcast on IPC push constants", () => {
    const tracking = readFileSync(
      join(__dirname, "../../src/main/services/TrackingService.ts"),
      "utf-8",
    );
    const inventory = readFileSync(
      join(__dirname, "../../src/main/services/InventoryService.ts"),
      "utf-8",
    );
    const chests = readFileSync(
      join(__dirname, "../../src/main/services/ChestService.ts"),
      "utf-8",
    );
    const pets = readFileSync(join(__dirname, "../../src/main/services/PetService.ts"), "utf-8");
    const boxTimers = readFileSync(
      join(__dirname, "../../src/main/services/BoxTimerService.ts"),
      "utf-8",
    );
    expect(tracking).toContain("IPC.STATS");
    expect(inventory).toContain("IPC.INVENTORY");
    expect(inventory).toContain("IPC.PRICES_PROGRESS");
    expect(chests).toContain("IPC.CHESTS");
    expect(pets).toContain("IPC.PETS");
    expect(boxTimers).toContain("IPC.BOX_TIMERS");
    const updates = readFileSync(
      join(__dirname, "../../src/main/services/UpdateService.ts"),
      "utf-8",
    );
    expect(updates).toContain("IPC.UPDATE_STATUS");
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
