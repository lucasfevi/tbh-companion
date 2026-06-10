import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  REQUIRED_BUNDLED_DATA_FILES,
  bundledDataCandidates,
  readBundledJson,
  resolveBundledDataPath,
} from "../../src/core/bundledData";
import { loadBoxTypeCatalog } from "../../src/core/boxes/catalog";

type ProcessWithResources = NodeJS.Process & { resourcesPath?: string };

describe("bundledData paths", () => {
  let tempResources = "";
  let previousResourcesPath: string | undefined;

  beforeEach(() => {
    tempResources = mkdtempSync(join(tmpdir(), "tbh-resources-"));
    previousResourcesPath = (process as ProcessWithResources).resourcesPath;
  });

  afterEach(() => {
    const proc = process as ProcessWithResources;
    if (previousResourcesPath === undefined) delete proc.resourcesPath;
    else proc.resourcesPath = previousResourcesPath;
    rmSync(tempResources, { recursive: true, force: true });
  });

  it("lists process.resourcesPath first when packaged", () => {
    (process as ProcessWithResources).resourcesPath = tempResources;
    const candidates = bundledDataCandidates("box_types.json");
    expect(candidates[0]).toBe(join(tempResources, "data", "box_types.json"));
  });

  it("resolves from resourcesPath/data in a packaged layout", () => {
    (process as ProcessWithResources).resourcesPath = tempResources;
    const dataDir = join(tempResources, "data");
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(join(dataDir, "box_types.json"), JSON.stringify({ types: [] }));

    const resolved = resolveBundledDataPath("box_types.json");
    expect(resolved).toBe(join(dataDir, "box_types.json"));
    expect(readBundledJson<{ types: unknown[] }>("box_types.json")).toEqual({ types: [] });
  });

  it("loads every required bundled file from the repo in dev", () => {
    delete (process as ProcessWithResources).resourcesPath;
    for (const file of REQUIRED_BUNDLED_DATA_FILES) {
      expect(() => resolveBundledDataPath(file)).not.toThrow();
      expect(readBundledJson(file)).toBeTruthy();
    }
  });

  it("throws with tried paths when a file is missing", () => {
    delete (process as ProcessWithResources).resourcesPath;
    expect(() => resolveBundledDataPath("missing-file.json")).toThrow(/Tried:/);
  });
});

describe("box catalogs use packaged data resolver", () => {
  it("loadBoxTypeCatalog reads bundled box_types.json", () => {
    const catalog = loadBoxTypeCatalog();
    expect(catalog.types.length).toBeGreaterThan(0);
  });
});
