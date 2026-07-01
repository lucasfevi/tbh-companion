import type {
  ChestDropBreakdownRow,
  ChestDropHistoryEntry,
  ChestDropStats,
  ChestDropTrackerSnapshot,
} from "../../shared/types";
import { canonicalTrackerBoxId, loadStageBoxCatalogFile } from "./stageBoxTracker";

export type ChestDropCategory = "common" | "rare";

export interface ResolvedStageBoxDrop {
  itemKey: number;
  name: string;
  category: ChestDropCategory;
}

const HISTORY_LIMIT = 500;
const HISTORY_VISIBLE = 50;

function nowSeconds(): number {
  return Date.now() / 1000;
}

function categoryFromPrefix(itemKey: number): ChestDropCategory | null {
  if (itemKey >= 910_000 && itemKey < 920_000) return "common";
  if (itemKey >= 920_000 && itemKey < 930_000) return "rare";
  return null;
}

/** Resolve a Player.log ItemKey to a tracked common or rare stage box. */
export function resolveStageBoxDrop(itemKey: number): ResolvedStageBoxDrop | null {
  const catalog = loadStageBoxCatalogFile();
  const canonicalId = canonicalTrackerBoxId(itemKey, catalog);
  const lookupKey = canonicalId ?? itemKey;
  const item = catalog.items.find((entry) => entry.id === lookupKey);
  if (item) {
    if (item.grade === "COMMON") {
      return { itemKey: lookupKey, name: item.name, category: "common" };
    }
    if (item.grade === "RARE") {
      return { itemKey: lookupKey, name: item.name, category: "rare" };
    }
    return null;
  }

  const category = categoryFromPrefix(lookupKey);
  if (!category) return null;
  return {
    itemKey: lookupKey,
    name: category === "common" ? `Common chest #${lookupKey}` : `Stage boss chest #${lookupKey}`,
    category,
  };
}

export class ChestDropTracker {
  private countsByKey = new Map<string, number>();
  private namesByKey = new Map<string, string>();
  private categoriesByKey = new Map<string, ChestDropCategory>();
  private history: ChestDropHistoryEntry[] = [];

  reset(): void {
    this.countsByKey.clear();
    this.namesByKey.clear();
    this.categoriesByKey.clear();
    this.history = [];
  }

  /**
   * Record a chest drop detected from a live box-count delta.
   * Records as a common chest for the given stageKey; returns false when
   * stageKey is invalid.
   */
  recordLiveBoxDrop(stageKey: number, wallTime = nowSeconds()): boolean {
    if (stageKey <= 0) return false;
    const key = String(stageKey);
    const name = `Common chest (stage ${stageKey})`;
    const category: ChestDropCategory = "common";

    this.countsByKey.set(key, (this.countsByKey.get(key) ?? 0) + 1);
    this.namesByKey.set(key, name);
    this.categoriesByKey.set(key, category);

    this.history.push({ wallTime, itemKey: stageKey, name, category });
    if (this.history.length > HISTORY_LIMIT) {
      this.history.splice(0, this.history.length - HISTORY_LIMIT);
    }
    return true;
  }

  recordLogDrop(itemKey: number, wallTime = nowSeconds()): boolean {
    const resolved = resolveStageBoxDrop(itemKey);
    if (!resolved) return false;

    const key = String(resolved.itemKey);
    this.countsByKey.set(key, (this.countsByKey.get(key) ?? 0) + 1);
    this.namesByKey.set(key, resolved.name);
    this.categoriesByKey.set(key, resolved.category);

    this.history.push({
      wallTime,
      itemKey: resolved.itemKey,
      name: resolved.name,
      category: resolved.category,
    });
    if (this.history.length > HISTORY_LIMIT) {
      this.history.splice(0, this.history.length - HISTORY_LIMIT);
    }

    return true;
  }

  getStats(elapsedSeconds: number): ChestDropStats {
    let commonTotal = 0;
    let rareTotal = 0;
    const breakdown: ChestDropBreakdownRow[] = [];

    for (const [key, count] of this.countsByKey) {
      if (count <= 0) continue;
      const category = this.categoriesByKey.get(key);
      const name = this.namesByKey.get(key);
      if (!category || !name) continue;

      if (category === "common") commonTotal += count;
      else rareTotal += count;

      breakdown.push({
        itemKey: Number.parseInt(key, 10),
        name,
        category,
        count,
      });
    }

    breakdown.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const combinedTotal = commonTotal + rareTotal;
    const hours = elapsedSeconds > 0 ? elapsedSeconds / 3600 : 0;
    const commonPerHour = hours > 0 ? commonTotal / hours : 0;
    const rarePerHour = hours > 0 ? rareTotal / hours : 0;

    return {
      commonTotal,
      rareTotal,
      combinedTotal,
      commonPerHour,
      rarePerHour,
      breakdown,
      history: this.history.slice(-HISTORY_VISIBLE).reverse(),
      readerRequired: true,
    };
  }

  captureSnapshot(): ChestDropTrackerSnapshot {
    return {
      countsByKey: Object.fromEntries(this.countsByKey),
      namesByKey: Object.fromEntries(this.namesByKey),
      categoriesByKey: Object.fromEntries(this.categoriesByKey),
      history: [...this.history],
    };
  }

  applySnapshot(data: ChestDropTrackerSnapshot): void {
    this.countsByKey = new Map(Object.entries(data.countsByKey));
    this.namesByKey = new Map(Object.entries(data.namesByKey));
    this.categoriesByKey = new Map(Object.entries(data.categoriesByKey));
    this.history = data.history ?? [];
  }
}
