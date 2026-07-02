import { describe, it, expect, vi, beforeEach } from "vitest";

const logWindowCrash = vi.fn();
const logWindowUnresponsive = vi.fn();
const loadRenderer = vi.fn();
const isAppQuitting = vi.hoisted(() => ({ value: false }));

vi.mock("../../src/main/log", () => ({
  logWindowCrash: (...args: unknown[]) => logWindowCrash(...args),
  logWindowUnresponsive: (...args: unknown[]) => logWindowUnresponsive(...args),
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

  it("logs unresponsive renderers without reloading", () => {
    const win = makeWindow();
    attachCrashRecovery(win as never, "main");

    win.fire("unresponsive");

    expect(logWindowUnresponsive).toHaveBeenCalledWith("main");
    expect(loadRenderer).not.toHaveBeenCalled();
  });
});
