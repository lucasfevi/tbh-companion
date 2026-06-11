import { describe, it, expect, vi, beforeEach } from "vitest";

const mockIsPackaged = vi.hoisted(() => ({ value: false }));

vi.mock("electron", () => ({
  app: {
    get isPackaged() {
      return mockIsPackaged.value;
    },
  },
}));

const autoUpdaterMock = vi.hoisted(() => ({
  autoDownload: false,
  autoInstallOnAppQuit: false,
  logger: null as unknown,
  on: vi.fn(),
  checkForUpdates: vi.fn(),
  downloadUpdate: vi.fn(),
  quitAndInstall: vi.fn(),
}));

vi.mock("electron-updater", () => ({
  autoUpdater: autoUpdaterMock,
}));

vi.mock("../../src/main/log", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("../../src/main/tray/trayService", () => ({
  setAppQuitting: vi.fn(),
}));

vi.mock("../../src/main/services/broadcast", () => ({
  broadcast: vi.fn(),
}));

import { UpdateService } from "../../src/main/services/UpdateService";

describe("UpdateService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPackaged.value = false;
  });

  it("reports disabled status in development", () => {
    const service = new UpdateService();
    service.start();

    expect(service.getStatus().phase).toBe("disabled");
    expect(service.getStatus().currentVersion.endsWith("-dev")).toBe(true);
    expect(autoUpdaterMock.on).not.toHaveBeenCalled();
    expect(autoUpdaterMock.checkForUpdates).not.toHaveBeenCalled();
  });

  it("does not call autoUpdater when checking in development", async () => {
    const service = new UpdateService();
    service.start();

    const status = await service.checkForUpdates();
    expect(status.phase).toBe("disabled");
    expect(autoUpdaterMock.checkForUpdates).not.toHaveBeenCalled();
  });

  it("wires autoUpdater when packaged", () => {
    mockIsPackaged.value = true;
    const service = new UpdateService();
    service.start();

    expect(service.getStatus().phase).toBe("idle");
    expect(service.getStatus().currentVersion.endsWith("-dev")).toBe(false);
    expect(autoUpdaterMock.autoDownload).toBe(false);
    expect(autoUpdaterMock.on).toHaveBeenCalled();
  });
});
