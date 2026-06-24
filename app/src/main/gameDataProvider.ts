import { readFileSync } from "node:fs";
import {
  catalogItemKeyFromSave,
  indexById,
  normalizeGameItem,
  type GameItem,
} from "../core/gamedata";
import { buildStageBoxCatalog, isStageBoxItemKey, stageBoxIdSet } from "../core/stageBoxes";
import { resolveBundledDataPath } from "../core/bundledData";

export class GameDataProvider {
  private index = new Map<number, GameItem>();
  private stageBoxIds = stageBoxIdSet();
  private loaded = false;

  private mergeStageBoxes(items: GameItem[]): void {
    this.stageBoxIds = stageBoxIdSet(items);
    for (const item of items) this.index.set(item.id, item);
  }

  private loadStageBoxes(): void {
    try {
      const path = resolveBundledDataPath("stage_boxes.json");
      const raw = readFileSync(path, "utf-8").replace(/^\uFEFF/, "");
      const d = JSON.parse(raw) as { items?: unknown[] };
      if (Array.isArray(d.items)) {
        const items = d.items
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
    this.mergeStageBoxes(buildStageBoxCatalog().items);
  }

  /** Load bundled gamedata. Throws if missing or invalid. */
  load(): void {
    const path = resolveBundledDataPath("gamedata.json");
    const raw = readFileSync(path, "utf-8").replace(/^\uFEFF/, "");
    let parsed: { source?: string; fetchedUtc?: string; items?: unknown[] };
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      throw new Error("gamedata.json: invalid JSON");
    }
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
      throw new Error("gamedata.json: missing or empty items array");
    }

    const items = parsed.items
      .map((row) => normalizeGameItem(row as Record<string, unknown>))
      .filter((item): item is GameItem => item != null);
    if (items.length === 0) {
      throw new Error("gamedata.json: no valid item rows");
    }

    this.index = indexById(items);
    this.loaded = true;
    this.loadStageBoxes();
  }

  get(itemKey: number): GameItem | undefined {
    return this.index.get(catalogItemKeyFromSave(itemKey));
  }

  isStageBox(itemKey: number): boolean {
    return isStageBoxItemKey(itemKey, this.stageBoxIds);
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  itemCount(): number {
    return this.index.size;
  }
}
