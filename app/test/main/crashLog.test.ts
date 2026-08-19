import { describe, it, expect, vi, beforeEach } from "vitest";

const { scopedLoggers, crashLoggerMock } = vi.hoisted(() => {
  const scopedLoggers = new Map<
    string,
    {
      info: ReturnType<typeof vi.fn>;
      warn: ReturnType<typeof vi.fn>;
      error: ReturnType<typeof vi.fn>;
      debug: ReturnType<typeof vi.fn>;
    }
  >();

  const crashLoggerMock = {
    transports: { file: {} as Record<string, unknown>, console: {} as Record<string, unknown> },
    error: vi.fn(),
    warn: vi.fn(),
  };

  return { scopedLoggers, crashLoggerMock };
});

vi.mock("electron", () => ({
  app: { getPath: () => "C:/fake/userData", isPackaged: false },
}));

vi.mock("electron-log/main", () => ({
  default: {
    transports: { file: {}, console: {} },
    scope: (name: string) => {
      if (!scopedLoggers.has(name)) {
        scopedLoggers.set(name, { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() });
      }
      return scopedLoggers.get(name)!;
    },
    create: () => crashLoggerMock,
  },
}));

import { logWindowCrash, logWindowUnresponsive } from "../../src/main/log";

describe("window crash logging (dual-write)", () => {
  beforeEach(() => {
    scopedLoggers.clear();
    crashLoggerMock.error.mockClear();
    crashLoggerMock.warn.mockClear();
  });

  it("logWindowCrash writes the same message to crash.log and the window scope in app.log", () => {
    logWindowCrash("main", "crashed", 1);

    const expected = "[main] renderer process gone (reason=crashed, exitCode=1)";
    expect(crashLoggerMock.error).toHaveBeenCalledWith(expected);
    expect(scopedLoggers.get("window")?.error).toHaveBeenCalledWith(expected);
  });

  it("logWindowUnresponsive writes a warn to both crash.log and the window scope in app.log", () => {
    logWindowUnresponsive("overlay");

    const expected = "[overlay] renderer unresponsive";
    expect(crashLoggerMock.warn).toHaveBeenCalledWith(expected);
    expect(scopedLoggers.get("window")?.warn).toHaveBeenCalledWith(expected);
  });
});
