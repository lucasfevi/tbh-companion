// Loads the game item catalog and keeps it fresh.
//
// Resolution order on load: user cache (if present) -> bundled snapshot. The
// bundled data/gamedata.json ships with the app so inventory works offline and
// on first run. refresh() re-scrapes tbh.city and writes the user cache, so a
// game patch that adds items is picked up without an app update (see
// docs/findings/item-mapping.md).

import { app } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  extractItemsFromHtml,
  indexById,
  type GameData,
  type GameItem,
} from "../core/gamedata";

const SOURCE_URL = "https://tbh.city/items";
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // a week

export interface GameDataStatus {
  loaded: boolean;
  count: number;
  fetchedUtc: string | null;
  source: "cache" | "bundled" | "none";
  stale: boolean;
}

export class GameDataProvider {
  private data: GameData | null = null;
  private index = new Map<number, GameItem>();
  private source: "cache" | "bundled" | "none" = "none";

  private cachePath(): string {
    try {
      return join(app.getPath("userData"), "gamedata.json");
    } catch {
      return join(process.cwd(), "gamedata.cache.json");
    }
  }

  private bundledPath(): string {
    const candidates = [
      join(process.resourcesPath ?? "", "data", "gamedata.json"), // packaged
      join(process.cwd(), "..", "data", "gamedata.json"), // dev (cwd = app/)
      join(process.cwd(), "data", "gamedata.json"),
    ];
    return candidates.find((p) => existsSync(p)) ?? candidates[candidates.length - 1];
  }

  private supplementPaths(): string[] {
    return [
      join(process.resourcesPath ?? "", "data", "hero_items.json"),
      join(process.cwd(), "..", "data", "hero_items.json"),
      join(process.cwd(), "data", "hero_items.json"),
    ];
  }

  private mergeSupplements(): void {
    for (const p of this.supplementPaths()) {
      if (!existsSync(p)) continue;
      try {
        const raw = readFileSync(p, "utf-8").replace(/^\uFEFF/, "");
        const sup = JSON.parse(raw) as { items?: GameItem[] };
        if (!Array.isArray(sup.items)) continue;
        for (const item of sup.items) {
          if (!this.index.has(item.id)) this.index.set(item.id, item);
        }
        break;
      } catch {
        // skip malformed supplement
      }
    }
  }

  /** Load the best available snapshot. Safe to call once at startup. */
  load(): void {
    const cache = this.cachePath();
    if (existsSync(cache) && this.tryLoad(cache)) {
      this.source = "cache";
      return;
    }
    const bundled = this.bundledPath();
    if (existsSync(bundled) && this.tryLoad(bundled)) {
      this.source = "bundled";
      return;
    }
    this.source = "none";
  }

  private tryLoad(path: string): boolean {
    try {
      // Strip a leading UTF-8 BOM; some snapshots were saved with one.
      const raw = readFileSync(path, "utf-8").replace(/^\uFEFF/, "");
      const d = JSON.parse(raw) as GameData;
      if (!Array.isArray(d.items)) return false;
      this.data = d;
      this.index = indexById(d.items);
      this.mergeSupplements();
      return true;
    } catch {
      return false;
    }
  }

  get(itemKey: number): GameItem | undefined {
    return this.index.get(itemKey);
  }

  status(): GameDataStatus {
    return {
      loaded: this.data !== null,
      count: this.data?.count ?? 0,
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

  /** Re-scrape tbh.city and persist to the user cache. */
  async refresh(): Promise<{ ok: boolean; count?: number; error?: string }> {
    try {
      const res = await fetch(SOURCE_URL, {
        headers: { "User-Agent": "Mozilla/5.0 (TBH Companion)" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const items = extractItemsFromHtml(html);
      if (items.length === 0) throw new Error("no items extracted");

      const data: GameData = {
        source: SOURCE_URL,
        fetchedUtc: new Date().toISOString(),
        count: items.length,
        items,
      };
      const cache = this.cachePath();
      mkdirSync(dirname(cache), { recursive: true });
      writeFileSync(cache, JSON.stringify(data));
      this.data = data;
      this.index = indexById(items);
      this.mergeSupplements();
      this.source = "cache";
      return { ok: true, count: items.length };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  /** Refresh in the background if the snapshot is past its TTL. */
  refreshIfStale(): void {
    if (this.isStale()) {
      void this.refresh();
    }
  }
}
