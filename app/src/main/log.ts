import { app } from "electron";
import log from "electron-log/main";
import { existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import type { ClearDiagnosticLogResult, RendererLogPayload } from "../../shared/types";

function resolveUserDataDir(): string {
  try {
    return app.getPath("userData");
  } catch {
    return process.cwd();
  }
}

export const DIAGNOSTIC_LOG_DIR = "logs";
export const DIAGNOSTIC_LOG_FILE = "app.log";
export const DIAGNOSTIC_LOG_ARCHIVE = "app.old.log";

export const THROTTLE_MS = 5 * 60 * 1000;

export interface ThrottleEntry {
  lastLoggedMs: number;
  suppressed: number;
}

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

const throttleState = new Map<string, ThrottleEntry>();
let initialized = false;

export function resolveDiagnosticLogDir(userDataDir = resolveUserDataDir()): string {
  return join(userDataDir, DIAGNOSTIC_LOG_DIR);
}

export function getDiagnosticLogPath(userDataDir = resolveUserDataDir()): string {
  return join(resolveDiagnosticLogDir(userDataDir), DIAGNOSTIC_LOG_FILE);
}

/** Redact password-like fields before writing to disk. */
export function sanitizeLogMessage(message: string): string {
  return message
    .replace(/es3Password\s*[:=]\s*["']?[^"'\s,}]+/gi, () => "es3Password=***")
    .replace(/(?<!es3)password\s*[:=]\s*["']?[^"'\s,}]+/gi, () => "password=***");
}

export function evaluateLogThrottle(
  state: Map<string, ThrottleEntry>,
  key: string,
  nowMs: number,
  windowMs: number,
): { action: "log" | "skip"; messageSuffix?: string } {
  const entry = state.get(key);
  if (!entry) {
    state.set(key, { lastLoggedMs: nowMs, suppressed: 0 });
    return { action: "log" };
  }

  if (nowMs - entry.lastLoggedMs < windowMs) {
    entry.suppressed += 1;
    return { action: "skip" };
  }

  const suffix =
    entry.suppressed > 0 ? ` (repeated ${entry.suppressed} times)` : undefined;
  entry.lastLoggedMs = nowMs;
  entry.suppressed = 0;
  return { action: "log", messageSuffix: suffix };
}

export function listDiagnosticLogFiles(userDataDir: string): string[] {
  const logDir = resolveDiagnosticLogDir(userDataDir);
  if (!existsSync(logDir)) return [];

  const relative: string[] = [];
  for (const name of readdirSync(logDir)) {
    if (name === DIAGNOSTIC_LOG_FILE || name === DIAGNOSTIC_LOG_ARCHIVE) {
      relative.push(join(DIAGNOSTIC_LOG_DIR, name));
    }
  }
  return relative.sort();
}

export function diagnosticLogExists(userDataDir: string): boolean {
  return listDiagnosticLogFiles(userDataDir).length > 0;
}

export function initDiagnosticLog(): void {
  if (initialized) return;
  initialized = true;

  const logDir = resolveDiagnosticLogDir();
  mkdirSync(logDir, { recursive: true });

  log.transports.file.resolvePathFn = () => getDiagnosticLogPath();
  log.transports.file.maxSize = 1024 * 1024;
  log.transports.file.sync = false;
  log.transports.file.level = "info";
  log.transports.console.level = app.isPackaged ? "warn" : "info";
}

export function createLogger(module: string): Logger {
  const scoped = log.scope(` ${module}`);

  const write = (level: "info" | "warn" | "error", message: string): void => {
    const sanitized = sanitizeLogMessage(message);
    const key = `${module}:${level}:${sanitized}`;
    if (level === "warn" || level === "error") {
      const result = evaluateLogThrottle(throttleState, key, Date.now(), THROTTLE_MS);
      if (result.action === "skip") return;
      const text = result.messageSuffix ? `${sanitized}${result.messageSuffix}` : sanitized;
      scoped[level](text);
      return;
    }
    scoped[level](sanitized);
  };

  return {
    info: (message) => write("info", message),
    warn: (message) => write("warn", message),
    error: (message) => write("error", message),
    debug: (message) => {
      if (app.isPackaged) return;
      scoped.debug(sanitizeLogMessage(message));
    },
  };
}

export function clearDiagnosticLogs(
  userDataDir = resolveUserDataDir(),
): ClearDiagnosticLogResult {
  const cleared: string[] = [];

  for (const rel of listDiagnosticLogFiles(userDataDir)) {
    const path = join(userDataDir, rel);
    try {
      unlinkSync(path);
      cleared.push(rel);
    } catch (err) {
      return {
        ok: false,
        cleared,
        error: `Could not delete ${rel}: ${(err as Error).message}`,
      };
    }
  }

  return { ok: true, cleared };
}

const rendererLog = createLogger("renderer");

export function logRendererError(payload: RendererLogPayload): void {
  const parts = [`[${payload.source}] ${payload.message}`];
  if (payload.stack) parts.push(payload.stack.slice(0, 2000));
  rendererLog.error(parts.join("\n"));
}
