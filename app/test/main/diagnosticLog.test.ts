import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
  THROTTLE_MS,
  clearDiagnosticLogs,
  evaluateLogThrottle,
  getDiagnosticLogPath,
  listDiagnosticLogFiles,
  sanitizeLogMessage,
  DIAGNOSTIC_LOG_ARCHIVE,
  DIAGNOSTIC_LOG_FILE,
  resolveDiagnosticLogDir,
} from "../../src/main/log";

describe("diagnosticLog", () => {
  let userDataDir = "";

  afterEach(() => {
    if (userDataDir) rmSync(userDataDir, { recursive: true, force: true });
    userDataDir = "";
  });

  it("sanitizeLogMessage redacts password fields", () => {
    expect(sanitizeLogMessage('es3Password: "secret123"')).toBe('es3Password=***"');
    expect(sanitizeLogMessage("password=abc")).toBe("password=***");
    expect(sanitizeLogMessage("stage 42")).toBe("stage 42");
  });

  it("evaluateLogThrottle suppresses repeats then summarizes", () => {
    const state = new Map<string, { lastLoggedMs: number; suppressed: number }>();
    const key = "saveWatcher:error:missing";

    expect(evaluateLogThrottle(state, key, 0, THROTTLE_MS).action).toBe("log");
    expect(evaluateLogThrottle(state, key, 1000, THROTTLE_MS).action).toBe("skip");
    expect(evaluateLogThrottle(state, key, 2000, THROTTLE_MS).action).toBe("skip");

    const afterWindow = evaluateLogThrottle(state, key, THROTTLE_MS + 1, THROTTLE_MS);
    expect(afterWindow.action).toBe("log");
    expect(afterWindow.messageSuffix).toBe(" (repeated 2 times)");
  });

  it("getDiagnosticLogPath resolves under userData logs folder", () => {
    userDataDir = mkdtempSync(join(tmpdir(), "tbh-log-"));
    expect(getDiagnosticLogPath(userDataDir)).toBe(join(userDataDir, "logs", DIAGNOSTIC_LOG_FILE));
    expect(resolveDiagnosticLogDir(userDataDir)).toBe(join(userDataDir, "logs"));
  });

  it("listDiagnosticLogFiles finds app.log and archive only", () => {
    userDataDir = mkdtempSync(join(tmpdir(), "tbh-log-"));
    const logDir = join(userDataDir, "logs");
    mkdirSync(logDir, { recursive: true });
    writeFileSync(join(logDir, DIAGNOSTIC_LOG_FILE), "line\n");
    writeFileSync(join(logDir, DIAGNOSTIC_LOG_ARCHIVE), "old\n");
    writeFileSync(join(logDir, "xp_history.csv"), "csv\n");

    expect(listDiagnosticLogFiles(userDataDir)).toEqual([
      join("logs", DIAGNOSTIC_LOG_FILE),
      join("logs", DIAGNOSTIC_LOG_ARCHIVE),
    ]);
  });

  it("clearDiagnosticLogs removes log files", () => {
    userDataDir = mkdtempSync(join(tmpdir(), "tbh-log-"));
    const logDir = join(userDataDir, "logs");
    mkdirSync(logDir, { recursive: true });
    writeFileSync(join(logDir, DIAGNOSTIC_LOG_FILE), "line\n");
    writeFileSync(join(logDir, DIAGNOSTIC_LOG_ARCHIVE), "old\n");

    const result = clearDiagnosticLogs(userDataDir);
    expect(result.ok).toBe(true);
    expect(result.cleared).toHaveLength(2);
    expect(existsSync(join(logDir, DIAGNOSTIC_LOG_FILE))).toBe(false);
    expect(existsSync(join(logDir, DIAGNOSTIC_LOG_ARCHIVE))).toBe(false);
    expect(existsSync(join(logDir, "xp_history.csv"))).toBe(false);
  });
});
