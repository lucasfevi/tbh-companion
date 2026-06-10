import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  BOX_TIMERS_FILE,
  CATALOG_FILES,
  CONFIG_FILE,
  SESSION_STATE_FILE,
  clearAppDataFiles,
  filesForClearTarget,
  getAppDataPaths,
  listPriceCacheFiles,
} from "../../src/main/services/appData";

describe("appData", () => {
  let userDataDir = "";

  beforeEach(() => {
    userDataDir = mkdtempSync(join(tmpdir(), "tbh-app-data-"));
  });

  afterEach(() => {
    rmSync(userDataDir, { recursive: true, force: true });
  });

  function touch(name: string, body = "{}"): void {
    writeFileSync(join(userDataDir, name), body);
  }

  it("lists price cache files in userData", () => {
    touch("prices.USD.json");
    touch("prices.EUR.json");
    touch("config.json");
    expect(listPriceCacheFiles(userDataDir)).toEqual(["prices.EUR.json", "prices.USD.json"]);
  });

  it("reports path entries and never marks config as clearable", () => {
    touch(CATALOG_FILES[0]);
    touch("prices.USD.json");
    touch(CONFIG_FILE);

    const paths = getAppDataPaths(userDataDir);
    expect(paths.userDataDir).toBe(userDataDir);
    expect(paths.entries.find((e) => e.id === "catalog")?.exists).toBe(true);
    expect(paths.entries.find((e) => e.id === "config")?.exists).toBe(true);
    expect(filesForClearTarget("catalog", userDataDir)).toEqual([...CATALOG_FILES]);
  });

  it("clears catalog files without touching config", () => {
    touch(CATALOG_FILES[0]);
    touch(CATALOG_FILES[1]);
    touch(CONFIG_FILE, '{"savePath":"x"}');

    const result = clearAppDataFiles("catalog", userDataDir);
    expect(result.ok).toBe(true);
    expect(result.cleared).toEqual([...CATALOG_FILES]);
    expect(existsSync(join(userDataDir, CONFIG_FILE))).toBe(true);
    expect(readFileSync(join(userDataDir, CONFIG_FILE), "utf-8")).toContain("savePath");
  });

  it("clears all caches except config", () => {
    touch(CATALOG_FILES[0]);
    touch("prices.USD.json");
    touch(BOX_TIMERS_FILE);
    touch(SESSION_STATE_FILE);
    touch(CONFIG_FILE);

    const result = clearAppDataFiles("all-except-config", userDataDir);
    expect(result.ok).toBe(true);
    expect(result.cleared).toContain("prices.USD.json");
    expect(result.cleared).toContain(BOX_TIMERS_FILE);
    expect(existsSync(join(userDataDir, CONFIG_FILE))).toBe(true);
  });

  it("returns ok when target files are already missing", () => {
    const result = clearAppDataFiles("prices", userDataDir);
    expect(result.ok).toBe(true);
    expect(result.cleared).toEqual([]);
  });

  it("includes diagnostic log path entry", () => {
    const logDir = join(userDataDir, "logs");
    mkdirSync(logDir, { recursive: true });
    writeFileSync(join(logDir, "app.log"), "startup\n");

    const paths = getAppDataPaths(userDataDir);
    expect(paths.diagnosticLogPath).toBe(join(userDataDir, "logs", "app.log"));
    expect(paths.entries.find((e) => e.id === "diagnostic-log")?.exists).toBe(true);
  });
});
