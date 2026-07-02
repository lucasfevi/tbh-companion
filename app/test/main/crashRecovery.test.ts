import { describe, it, expect, vi, beforeEach } from "vitest";

const logWindowCrash = vi.fn();
const logWindowUnresponsive = vi.fn();
const loadRenderer = vi.fn();
const isAppQuitting = vi.hoisted(() => ({ value: false }));
const windowLog = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

vi.mock("../../src/main/log", () => ({
  logWindowCrash: (...args: unknown[]) => logWindowCrash(...args),
  logWindowUnresponsive: (...args: unknown[]) => logWindowUnresponsive(...args),
  createLogger: () => windowLog,
}));

vi.mock("../../src/main/tray/trayService", () => ({
  isAppQuitting: () => isAppQuitting.value,
}));

vi.mock("../../src/main/windows/loadRenderer", () => ({
  loadRenderer: (...args: unknown[]) => loadRenderer(...args),
}));

import { attachCrashRecovery } from "../../src/main/windows/crashRecovery";

type Handler = (...args: unknown[]) => void;

function makeWindow(destroyed = false) {
  const handlers = new Map<string, Handler>();
  return {
    isDestroyed: () => destroyed,
    loadURL: vi.fn(),
    webContents: {
      on: (event: string, handler: Handler) => {
        handlers.set(event, handler);
      },
    },
    fire(event: string, ...args: unknown[]) {
      handlers.get(event)?.(...args);
    },
  };
}

describe("attachCrashRecovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAppQuitting.value = false;
  });

  it("logs and reloads the window when the renderer process dies", () => {
    const win = makeWindow();
    attachCrashRecovery(win as never, "main");

    win.fire("render-process-gone", {}, { reason: "crashed", exitCode: 1 });

    expect(logWindowCrash).toHaveBeenCalledWith("main", "crashed", 1);
    expect(loadRenderer).toHaveBeenCalledWith(win, "main");
  });

  it("does not reload once the app is quitting", () => {
    const win = makeWindow();
    attachCrashRecovery(win as never, "overlay");
    isAppQuitting.value = true;

    win.fire("render-process-gone", {}, { reason: "killed", exitCode: 0 });

    expect(logWindowCrash).toHaveBeenCalled();
    expect(loadRenderer).not.toHaveBeenCalled();
  });

  it("does not reload an already-destroyed window", () => {
    const win = makeWindow(true);
    attachCrashRecovery(win as never, "box-tracker");

    win.fire("render-process-gone", {}, { reason: "oom", exitCode: 137 });

    expect(loadRenderer).not.toHaveBeenCalled();
  });

  it("stops auto-reloading after repeated crashes within the guard window", () => {
    const win = makeWindow();
    attachCrashRecovery(win as never, "main");

    for (let i = 0; i < 5; i++) {
      win.fire("render-process-gone", {}, { reason: "crashed", exitCode: 1 });
    }

    expect(logWindowCrash).toHaveBeenCalledTimes(5);
    expect(loadRenderer).toHaveBeenCalledTimes(3);
  });

  it("shows a restart-the-app fallback page and logs the give-up once", () => {
    const win = makeWindow();
    attachCrashRecovery(win as never, "main");

    for (let i = 0; i < 5; i++) {
      win.fire("render-process-gone", {}, { reason: "crashed", exitCode: 1 });
    }

    expect(win.loadURL).toHaveBeenCalledTimes(1);
    expect(win.loadURL.mock.calls[0][0]).toContain("data:text/html");
    expect(win.loadURL.mock.calls[0][0]).toContain("restart");
    expect(windowLog.error).toHaveBeenCalledTimes(1);
    expect(windowLog.error.mock.calls[0][0]).toMatch(/auto-reload suppressed/);
  });

  it("logs unresponsive renderers without reloading", () => {
    const win = makeWindow();
    attachCrashRecovery(win as never, "main");

    win.fire("unresponsive");

    expect(logWindowUnresponsive).toHaveBeenCalledWith("main");
    expect(loadRenderer).not.toHaveBeenCalled();
  });
});
