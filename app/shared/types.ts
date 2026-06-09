// Types shared across the Electron main, preload, and renderer processes.

export interface HeroSnapshot {
  key: string;
  level: number;
  exp: number;
  unlocked: boolean;
}

export interface SaveSnapshot {
  heroes: HeroSnapshot[];
  totalHeroExp: number;
  cubeLevel: number;
  cubeExp: number;
  playTime: number;
  saveMtime: number; // epoch seconds (file mtime)
  stageKey: number;
  stageWave: number;
  maxStage: number;
  gold: number;
}

export interface HistoryEntry {
  wallTime: number; // epoch seconds when read
  delta: number; // XP gained on this read
  rate: number; // rolling XP/hour at this point
  totalXp: number;
  stageKey: number;
  stageWave: number;
}

export interface HeroRate {
  key: string;
  name: string;
  level: number;
  rate: number; // rolling XP/hour for this hero
}

// Live payload pushed from main to the renderer.
export interface Stats {
  connected: boolean;
  status: string;
  rollingRate: number; // XP/hour
  sessionRate: number; // XP/hour
  goldRate: number; // gold/hour (earned)
  cumulativeGained: number; // XP gained this session
  goldGained: number; // gold earned this session
  elapsed: number; // seconds since session start
  secondsSinceGain: number | null;
  secondsSinceRead: number | null;
  stageKey: number;
  stageWave: number;
  heroes: HeroRate[];
  history: HistoryEntry[];
}

export interface GameDataStatus {
  loaded: boolean;
  count: number;
  fetchedUtc: string | null;
  source: "cache" | "bundled" | "none";
  stale: boolean;
}

export interface GameDataRefreshResult {
  ok: boolean;
  count?: number;
  error?: string;
  status: GameDataStatus;
}

// --- Inventory ---

// Raw owned-item instance from itemSaveDatas (the master list of all owned
// items: inventory + stash + trading + equipped). UniqueId is intentionally
// omitted: it exceeds JS's safe-integer range, so JSON.parse rounds it and
// distinct ids can collide (~6/185 observed). We list by array, not by id.
export interface InventoryItemInstance {
  itemKey: number;
  isChaotic: boolean;
}

export interface ChestHolding {
  type: number;
  quantity: number;
}

export interface InventorySnapshot {
  items: InventoryItemInstance[];
  chests: ChestHolding[];
  saveMtime: number;
}

// Owned items grouped by ItemKey and resolved against the game catalog.
export interface ResolvedInventoryRow {
  itemKey: number;
  name: string; // "Unknown #<key>" when not in the catalog
  grade: string;
  type: string; // GEAR | MATERIAL | ...
  marketTradable: boolean;
  count: number;
  chaoticCount: number;
  known: boolean;
}

export interface InventoryComposition {
  total: number;
  byGrade: Record<string, number>;
  byType: Record<string, number>;
  tradableCount: number;
  unknownCount: number;
  chaoticCount: number;
}

export interface ResolvedInventory {
  rows: ResolvedInventoryRow[];
  composition: InventoryComposition;
  chests: ChestHolding[];
  saveMtime: number;
  gameDataLoaded: boolean;
}

export interface PriceStatus {
  currency: string;
  count: number;
  fetchedUtc: string | null;
  running: boolean;
}

export interface PriceProgress {
  done: number;
  total: number;
  current: string;
  priced: number;
  failed: number;
}

export interface PriceRefreshResult {
  ok: boolean;
  priced: number;
  skipped: number;
  failed: number;
  stopped: "completed" | "cancelled" | "rate-limited";
  currency: string;
  error?: string;
}

// API surface exposed on `window.tbh` by the preload via contextBridge.
export interface TbhApi {
  onStats(cb: (stats: Stats) => void): () => void;
  reset(): void;
  getStats(): Promise<Stats | null>;
  openOverlay(): void;
  showMain(): void;
  closeOverlay(): void;
  gameDataStatus(): Promise<GameDataStatus>;
  refreshGameData(): Promise<GameDataRefreshResult>;
  getInventory(): Promise<ResolvedInventory | null>;
  onInventory(cb: (inv: ResolvedInventory) => void): () => void;
  pricesStatus(): Promise<PriceStatus>;
  refreshPrices(force?: boolean): Promise<PriceRefreshResult & { status: PriceStatus }>;
  cancelPrices(): void;
  setCurrency(iso: string): Promise<PriceStatus>;
  onPricesProgress(cb: (p: PriceProgress) => void): () => void;
}
