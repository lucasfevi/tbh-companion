import { app } from "electron";
import { existsSync, readdirSync, unlinkSync } from "node:fs";
import { basename, join } from "node:path";
import type {
  AppDataClearTarget,
  AppDataPathEntry,
  AppDataPaths,
  ClearAppDataResult,
} from "../../../shared/types";
import { DIAGNOSTIC_LOG_FILE, getDiagnosticLogPath, listDiagnosticLogFiles } from "../log";

export const CATALOG_FILES = ["gamedata.json", "gear_levels.json"] as const;
export const BOX_TIMERS_FILE = "box_timers.json";
export const SESSION_STATE_FILE = "session_state.json";
export const CONFIG_FILE = "config.json";
const PRICE_CACHE_PREFIX = "prices.";
const PRICE_CACHE_SUFFIX = ".json";

export function resolveUserDataDir(): string {
  try {
    return app.getPath("userData");
  } catch {
    return process.cwd();
  }
}

export function listPriceCacheFiles(userDataDir: string): string[] {
  if (!existsSync(userDataDir)) return [];
  return readdirSync(userDataDir)
    .filter((name) => name.startsWith(PRICE_CACHE_PREFIX) && name.endsWith(PRICE_CACHE_SUFFIX))
    .sort();
}

function entryExists(userDataDir: string, files: string[]): boolean {
  return files.some((name) => existsSync(join(userDataDir, name)));
}

export function getAppDataPaths(userDataDir = resolveUserDataDir()): AppDataPaths {
  const priceFiles = listPriceCacheFiles(userDataDir);
  const configPath = join(userDataDir, CONFIG_FILE);
  const diagnosticFiles = listDiagnosticLogFiles(userDataDir);

  const entries: AppDataPathEntry[] = [
    {
      id: "catalog",
      label: "Item catalog cache",
      files: [...CATALOG_FILES],
      exists: entryExists(userDataDir, [...CATALOG_FILES]),
    },
    {
      id: "prices",
      label: "Steam Market prices",
      files:
        priceFiles.length > 0
          ? priceFiles
          : [`${PRICE_CACHE_PREFIX}<currency>${PRICE_CACHE_SUFFIX}`],
      exists: priceFiles.length > 0,
    },
    {
      id: "box-timers",
      label: "Stage boss chest tracker",
      files: [BOX_TIMERS_FILE],
      exists: existsSync(join(userDataDir, BOX_TIMERS_FILE)),
    },
    {
      id: "session",
      label: "Session snapshot",
      files: [SESSION_STATE_FILE],
      exists: existsSync(join(userDataDir, SESSION_STATE_FILE)),
    },
    {
      id: "config",
      label: "Settings (never cleared here)",
      files: [CONFIG_FILE],
      exists: existsSync(configPath),
    },
    {
      id: "diagnostic-log",
      label: "Diagnostic log",
      files: diagnosticFiles.length > 0 ? diagnosticFiles : [`logs/${DIAGNOSTIC_LOG_FILE}`],
      exists: diagnosticFiles.length > 0,
    },
  ];

  return { userDataDir, configPath, entries, diagnosticLogPath: getDiagnosticLogPath(userDataDir) };
}

export function filesForClearTarget(
  target: AppDataClearTarget,
  userDataDir = resolveUserDataDir(),
): string[] {
  switch (target) {
    case "catalog":
      return [...CATALOG_FILES];
    case "prices":
      return listPriceCacheFiles(userDataDir);
    case "box-timers":
      return [BOX_TIMERS_FILE];
    case "session":
      return [SESSION_STATE_FILE];
    case "all-except-config":
      return [
        ...CATALOG_FILES,
        ...listPriceCacheFiles(userDataDir),
        BOX_TIMERS_FILE,
        SESSION_STATE_FILE,
      ];
    default:
      return [];
  }
}

/** Delete on-disk cache files for a target. Never touches config.json. */
export function clearAppDataFiles(
  target: AppDataClearTarget,
  userDataDir = resolveUserDataDir(),
): ClearAppDataResult {
  const names = filesForClearTarget(target, userDataDir);
  const cleared: string[] = [];

  for (const name of names) {
    if (name === CONFIG_FILE) continue;
    const path = join(userDataDir, name);
    if (!existsSync(path)) continue;
    try {
      unlinkSync(path);
      cleared.push(name);
    } catch (err) {
      return {
        ok: false,
        cleared,
        error: `Could not delete ${basename(path)}: ${(err as Error).message}`,
      };
    }
  }

  return { ok: true, cleared };
}
