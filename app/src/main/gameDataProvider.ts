import { app } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { GameDataStatus } from "../../shared/types";
import {
  CATALOG_SOURCE,
  extractAndEnrichItemsFromHtml,
  indexById,
  catalogHasGearLevels,
  normalizeGameItem,
  type GameData,
  type GameItem,
} from "../core/gamedata";
import {
  buildStageBoxCatalog,
  isStageBoxItemKey,
  stageBoxIdSet,
} from "../core/stageBoxes";

const CATALOG_FETCH_URL = "https://tbh.city/items";
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // a week

export class GameDataProvider {
  private data: GameData | null = null;
  private index = new Map<number, GameItem>();
  private stageBoxIds = stageBoxIdSet();
  private source: "cache" | "bundled" | "none" = "none";

  private cachePath(): string {
    try {
      return join(app.getPath("userData"), "gamedata.json");
    } catch {
      return join(process.cwd(), "gamedata.cache.json");
    }
  }

  private levelCachePath(): string {
    try {
      return join(app.getPath("userData"), "gear_levels.json");
    } catch {
      return join(process.cwd(), "gear_levels.cache.json");
    }
  }

  private bundledDataPath(filename: string): string {
    const candidates = [
      join(process.resourcesPath ?? "", "data", filename),
      join(process.cwd(), "..", "data", filename),
      join(process.cwd(), "data", filename),
    ];
    return candidates.find((p) => existsSync(p)) ?? candidates[candidates.length - 1];
  }

  private loadLevelCache(): Map<string, number> {
    const path = this.levelCachePath();
    if (!existsSync(path)) return new Map();
    try {
      const raw = JSON.parse(readFileSync(path, "utf-8").replace(/^\uFEFF/, "")) as {
        levels?: Record<string, number>;
      };
      return new Map(Object.entries(raw.levels ?? {}));
    } catch {
      return new Map();
    }
  }

  private saveLevelCache(levels: ReadonlyMap<string, number>): void {
    const path = this.levelCachePath();
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify({ levels: Object.fromEntries(levels) }));
  }

  private mergeStageBoxes(items: GameItem[]): void {
    this.stageBoxIds = stageBoxIdSet(items);
    for (const item of items) this.index.set(item.id, item);
  }

  private loadStageBoxes(): void {
    const path = this.bundledDataPath("stage_boxes.json");
    if (existsSync(path)) {
      try {
        const raw = JSON.parse(readFileSync(path, "utf-8").replace(/^\uFEFF/, "")) as {
          items?: unknown[];
        };
        if (Array.isArray(raw.items)) {
          const items = raw.items
            .map((row) => normalizeGameItem(row as Record<string, unknown>))
            .filter((item): item is GameItem => item != null);
          if (items.length > 0) {
            this.mergeStageBoxes(items);
            return;
          }
        }
      } catch {
        // fall through to in-code catalog
      }
    }
    this.mergeStageBoxes(buildStageBoxCatalog().items);
  }

  /** Load the best available snapshot. Safe to call once at startup. */
  load(): void {
    const cache = this.cachePath();
    const bundled = this.bundledDataPath("gamedata.json");

    if (existsSync(cache) && this.tryLoad(cache)) {
      this.source = "cache";
      if (!catalogHasGearLevels(this.index.values()) && this.tryLoadBundledLevelsOverlay(bundled)) {
        this.loadStageBoxes();
        return;
      }
      this.loadStageBoxes();
      return;
    }
    if (existsSync(bundled) && this.tryLoad(bundled)) {
      this.source = "bundled";
      this.loadStageBoxes();
      return;
    }
    this.source = "none";
    this.loadStageBoxes();
  }

  overlayMissingLevelsFromBundled(): boolean {
    if (catalogHasGearLevels(this.index.values())) return false;
    return this.tryLoadBundledLevelsOverlay(this.bundledDataPath("gamedata.json"));
  }

  private tryLoadBundledLevelsOverlay(bundledPath: string): boolean {
    if (!existsSync(bundledPath)) return false;
    try {
      const raw = readFileSync(bundledPath, "utf-8").replace(/^\uFEFF/, "");
      const d = JSON.parse(raw) as { items?: unknown[] };
      if (!Array.isArray(d.items)) return false;

      let patched = 0;
      for (const row of d.items) {
        const bundled = normalizeGameItem(row as Record<string, unknown>);
        if (!bundled || bundled.level == null) continue;
        const existing = this.index.get(bundled.id);
        if (existing && existing.level == null) {
          existing.level = bundled.level;
          patched++;
        }
      }
      if (patched > 0 && this.data) {
        this.data.items = [...this.index.values()].filter((item) => !this.isStageBox(item.id));
      }
      return patched > 0;
    } catch {
      return false;
    }
  }

  private tryLoad(path: string): boolean {
    try {
      const raw = readFileSync(path, "utf-8").replace(/^\uFEFF/, "");
      const d = JSON.parse(raw) as {
        source?: string;
        fetchedUtc?: string;
        count?: number;
        items?: unknown[];
      };
      if (!Array.isArray(d.items)) return false;
      const items = d.items
        .map((row) => normalizeGameItem(row as Record<string, unknown>))
        .filter((item): item is GameItem => item != null);
      this.data = {
        source: d.source ?? CATALOG_SOURCE,
        fetchedUtc: d.fetchedUtc ?? "",
        items,
        count: items.length,
      };
      this.index = indexById(items);
      return true;
    } catch {
      return false;
    }
  }

  get(itemKey: number): GameItem | undefined {
    return this.index.get(itemKey);
  }

  isStageBox(itemKey: number): boolean {
    return isStageBoxItemKey(itemKey, this.stageBoxIds);
  }

  status(): GameDataStatus {
    return {
      loaded: this.data !== null,
      count: this.index.size,
      fetchedUtc: this.data?.fetchedUtc ?? null,
      source: this.source,
      stale: this.isStale(),
    };
  }

  isStale(): boolean {
    if (!this.data?.fetchedUtc) return true;
    const ts = Date.parse(this.data.fetchedUtc);
    if (Number.isNaN(ts)) return true;
    return Date.now() - ts > REFRESH_TTL_MS;
  }

  async refresh(): Promise<{ ok: boolean; count?: number; error?: string }> {
    try {
      const res = await fetch(CATALOG_FETCH_URL, {
        headers: { "User-Agent": "Mozilla/5.0 (TBH Companion)" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const existingLevels = this.loadLevelCache();
      const { items, levelsByTemplate } = await extractAndEnrichItemsFromHtml(html, existingLevels);
      if (items.length === 0) throw new Error("no items extracted");

      const data: GameData = {
        source: CATALOG_SOURCE,
        fetchedUtc: new Date().toISOString(),
        count: items.length,
        items,
      };
      const cache = this.cachePath();
      mkdirSync(dirname(cache), { recursive: true });
      writeFileSync(cache, JSON.stringify(data));
      this.saveLevelCache(levelsByTemplate);
      this.data = data;
      this.index = indexById(items);
      this.loadStageBoxes();
      this.source = "cache";
      return { ok: true, count: this.index.size };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  refreshIfStale(onComplete?: () => void): void {
    if (this.isStale()) {
      void this.refresh().then((result) => {
        if (result.ok) onComplete?.();
      });
    }
  }
}
