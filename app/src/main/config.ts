// Loads companion settings, reusing the existing config.json shape.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { app } from "electron";
import {
  DEFAULT_NOTIFICATION_PREFS,
  migrateNotificationPrefs,
  sanitizeInventoryAlmostFullThresholdPercent,
  sanitizeNotificationVolume,
  type LegacyChestSoundVariant,
} from "../../shared/notificationCatalog";
import type {
  AppConfig,
  ChestAutoOpenPrefs,
  LiveMemoryPrefs,
  NotificationPrefs,
} from "../../shared/types";
import { DEFAULT_PASSWORD } from "../core/es3";

export type { AppConfig };

const DEFAULT_SAVE = join(
  "%USERPROFILE%",
  "AppData",
  "LocalLow",
  "TesseractStudio",
  "TaskbarHero",
  "SaveFile_Live.es3",
);

const DEFAULT_CHEST_AUTO_OPEN: ChestAutoOpenPrefs = {
  common: false,
  stageBoss: false,
};

const DEFAULT_LIVE_MEMORY: LiveMemoryPrefs = {
  enabled: false,
  consentAccepted: false,
};

const DEFAULTS: AppConfig = {
  savePath: DEFAULT_SAVE,
  es3Password: DEFAULT_PASSWORD,
  pollIntervalSeconds: 5,
  rollingWindowMinutes: 5,
  startTopmost: true,
  logHistoryCsv: true,
  currency: "USD",
  notificationsEnabled: true,
  notifyOnUpdateAvailable: true,
  notificationVolume: 100,
  notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
  inventoryAlmostFullThresholdPercent: 90,
  chestAutoOpenEnabled: DEFAULT_CHEST_AUTO_OPEN,
  liveMemory: DEFAULT_LIVE_MEMORY,
};

type RawConfig = Partial<AppConfig> & { chestSoundVariant?: LegacyChestSoundVariant };

function sanitizeChestAutoOpenPrefs(
  raw: Partial<ChestAutoOpenPrefs> | undefined,
): ChestAutoOpenPrefs {
  return {
    common: Boolean(raw?.common),
    stageBoss: Boolean(raw?.stageBoss),
  };
}

function sanitizeLiveMemoryPrefs(raw: Partial<LiveMemoryPrefs> | undefined): LiveMemoryPrefs {
  return {
    enabled: Boolean(raw?.enabled),
    consentAccepted: Boolean(raw?.consentAccepted),
  };
}

function normalizeConfig(raw: RawConfig): AppConfig {
  const {
    chestSoundVariant: _legacy,
    notificationPrefs: _prefs,
    notificationVolume: _volume,
    inventoryAlmostFullThresholdPercent: _threshold,
    chestAutoOpenEnabled: _autoOpen,
    liveMemory: _liveMemory,
    ...rest
  } = raw;
  const notificationPrefs: NotificationPrefs = migrateNotificationPrefs(raw);
  const notificationVolume = sanitizeNotificationVolume(raw.notificationVolume);
  const inventoryAlmostFullThresholdPercent = sanitizeInventoryAlmostFullThresholdPercent(
    raw.inventoryAlmostFullThresholdPercent,
  );
  const chestAutoOpenEnabled = sanitizeChestAutoOpenPrefs(raw.chestAutoOpenEnabled);
  const liveMemory = sanitizeLiveMemoryPrefs(raw.liveMemory);
  return {
    ...DEFAULTS,
    ...rest,
    notificationPrefs,
    notificationVolume,
    inventoryAlmostFullThresholdPercent,
    chestAutoOpenEnabled,
    liveMemory,
  };
}

/** Normalizes raw config JSON (migration + validation). Exported for tests. */
export function normalizeConfigFromRaw(raw: RawConfig): AppConfig {
  return normalizeConfig(raw);
}

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

export function loadConfig(): AppConfig {
  for (const p of candidatePaths()) {
    if (!existsSync(p)) continue;
    try {
      const raw = JSON.parse(readFileSync(p, "utf-8")) as RawConfig;
      return normalizeConfig(raw);
    } catch {
      // fall through to defaults on malformed config
    }
  }
  return normalizeConfig({});
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
  const toSave = normalizeConfig({ ...existing, ...config });
  writeFileSync(target, JSON.stringify(toSave, null, 2));
}
