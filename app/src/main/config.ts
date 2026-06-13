// Loads companion settings, reusing the existing config.json shape.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { platform } from "node:os";
import { app } from "electron";
import type { AppConfig } from "../../shared/types";
import { DEFAULT_PASSWORD } from "../core/es3";

export type { AppConfig };

/** Relative save path fragment shared across all Linux candidate paths. */
const STEAM_REL = join(
  "steamapps",
  "compatdata",
  "3678970",
  "pfx",
  "drive_c",
  "users",
  "steamuser",
  "AppData",
  "LocalLow",
  "TesseractStudio",
  "TaskbarHero",
  "SaveFile_Live.es3",
);

/**
 * Return candidate save paths for Linux Steam/Proton, ordered by likelihood.
 * This is a pure function (no I/O) so it can be tested without mocking fs.
 */
export function getDefaultSavePathCandidates(home: string): string[] {
  return [
    // Arch/Omarchy native pacman Steam: ~/.local/share/Steam/steamapps/compatdata/...
    join(home, ".local", "share", "Steam", STEAM_REL),
    // Standard Steam (via ~/.steam/steam symlink)
    join(home, ".steam", "steam", STEAM_REL),
    // Flatpak Steam
    join(home, ".var", "app", "com.valvesoftware.Steam", "data", "steam", STEAM_REL),
  ];
}

/** Return the platform-appropriate default save path. */
export function getDefaultSavePath(): string {
  if (platform() === "win32") {
    return join(
      "%USERPROFILE%",
      "AppData",
      "LocalLow",
      "TesseractStudio",
      "TaskbarHero",
      "SaveFile_Live.es3",
    );
  }
  const home = process.env.HOME ?? "";
  const candidates = getDefaultSavePathCandidates(home);
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  // Fallback — return first candidate even if it doesn't exist yet
  return candidates[0] ?? "";
}

const DEFAULTS: AppConfig = {
  savePath: "", // resolved on load via getDefaultSavePath()
  es3Password: DEFAULT_PASSWORD,
  pollIntervalSeconds: 5,
  rollingWindowMinutes: 5,
  startTopmost: true,
  logHistoryCsv: true,
  currency: "USD",
  notificationsEnabled: true,
  notifyOnUpdateAvailable: true,
  chestSoundVariant: "soft-chime",
};

// Expand %VAR% (Windows) and ~ in a path.
export function expandPath(p: string): string {
  let out = p.replace(/%([^%]+)%/g, (_m, name: string) => process.env[name] ?? `%${name}%`);
  if (out.startsWith("~")) {
    const home = process.env.USERPROFILE ?? process.env.HOME ?? "";
    out = join(home, out.slice(1));
  }
  return out;
}

// Search order: packaged userData, then dev locations (cwd, repo root).
function candidatePaths(): string[] {
  const paths: string[] = [];
  try {
    paths.push(join(app.getPath("userData"), "config.json"));
  } catch {
    // app not ready / non-electron context
  }
  paths.push(join(process.cwd(), "config.json"));
  paths.push(join(process.cwd(), "..", "config.json"));
  return paths;
}

export function resolveConfig(defaults: AppConfig): AppConfig {
  if (!defaults.savePath) {
    defaults.savePath = getDefaultSavePath();
  }
  return defaults;
}

export function loadConfig(): AppConfig {
  for (const p of candidatePaths()) {
    if (!existsSync(p)) continue;
    try {
      const raw = JSON.parse(readFileSync(p, "utf-8")) as Partial<AppConfig>;
      return resolveConfig({ ...DEFAULTS, ...raw });
    } catch {
      // fall through to defaults on malformed config
    }
  }
  return resolveConfig({ ...DEFAULTS });
}

// Persist the live config to the user-writable location (userData/config.json),
// merging over whatever is on disk. Used by runtime settings like currency.
export function saveConfig(config: AppConfig): void {
  let target: string;
  try {
    target = join(app.getPath("userData"), "config.json");
  } catch {
    target = join(process.cwd(), "config.json");
  }
  let existing: Partial<AppConfig> = {};
  if (existsSync(target)) {
    try {
      existing = JSON.parse(readFileSync(target, "utf-8")) as Partial<AppConfig>;
    } catch {
      existing = {};
    }
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify({ ...existing, ...config }, null, 2));
}
