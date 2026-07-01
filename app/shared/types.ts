// Types shared across the Electron main, preload, and renderer processes.

import type { NotificationPrefs, NotificationSoundId } from "./notificationCatalog";

export type {
  NotificationKindId,
  NotificationKindPreference,
  NotificationPrefs,
  NotificationSoundId,
} from "./notificationCatalog";

/** Main → renderer: play a bundled notification WAV at 0–100% volume. */
export interface NotificationSoundPayload {
  soundId: NotificationSoundId;
  volumePercent: number;
}

export interface HeroSnapshot {
  key: string;
  level: number;
  exp: number;
  unlocked: boolean;
}

export interface SaveSnapshot {
  heroes: HeroSnapshot[];
  totalHeroExp: number;
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

export interface ChestDropBreakdownRow {
  itemKey: number;
  name: string;
  category: "common" | "rare";
  count: number;
}

export interface ChestDropHistoryEntry {
  wallTime: number;
  itemKey: number;
  name: string;
  category: "common" | "rare";
}

export interface ChestDropStats {
  commonTotal: number;
  rareTotal: number;
  combinedTotal: number;
  commonPerHour: number;
  rarePerHour: number;
  breakdown: ChestDropBreakdownRow[];
  history: ChestDropHistoryEntry[];
  playerLogAvailable: boolean;
}

/** Serialized chest drop tracker for session_state.json restore. */
export interface ChestDropTrackerSnapshot {
  countsByKey: Record<string, number>;
  namesByKey: Record<string, string>;
  categoriesByKey: Record<string, "common" | "rare">;
  history: ChestDropHistoryEntry[];
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
  chestDrops: ChestDropStats;
}

/** Serialized XP tracker internals for session_state.json restore. */
export interface TrackerRateMeterSnapshot {
  window: number;
  gained: number;
  rolling: number;
  samples: Array<[number, number]>;
}

export interface TrackerSnapshot {
  sessionStart: number;
  cumulativeGained: number;
  currentTotalXp: number;
  currentGold: number;
  goldGained: number;
  heroes: HeroSnapshot[];
  history: HistoryEntry[];
  lastGainMtime: number | null;
  prevHero: Record<string, number>;
  heroMeters: Record<string, TrackerRateMeterSnapshot>;
  samples: Array<[number, number]>;
  initialized: boolean;
  firstMtime: number | null;
  lastChangeMtime: number | null;
  rollingRateValue: number;
  sessionRateValue: number;
  prevGold: number | null;
  goldSamples: Array<[number, number]>;
  goldFirstMtime: number | null;
  goldLastChangeMtime: number | null;
  goldRollingRateValue: number;
  goldSessionRateValue: number;
}

export interface SessionUiSnapshot {
  miniOverlayOpen: boolean;
  boxTrackerOpen: boolean;
}

/** On-disk session_state.json shape (tracker + overlay flags). */
export interface PersistedSessionState {
  version: 1;
  savePath: string;
  lastSaveMtime: number;
  rollingWindowMinutes: number;
  tracker: TrackerSnapshot;
  chestDropTracker?: ChestDropTrackerSnapshot;
  ui: SessionUiSnapshot;
}

// --- Inventory ---

// Raw owned-item instance from itemSaveDatas (the master list of all owned
// items: inventory + stash + trading + equipped).
export type ItemLocation = "inventory" | "stash" | "trading" | "equipped" | "unknown";

export interface InventoryItemInstance {
  itemKey: number;
  isChaotic: boolean;
  inUse: boolean;
  location: ItemLocation;
}

export interface ChestHolding {
  type: number;
  quantity: number;
}

export interface InventorySnapshot {
  items: InventoryItemInstance[];
  chests: ChestHolding[];
  saveMtime: number;
  /** Stack counts from aggregateSaveDatas when decoded (materials only). */
  materialStacks?: Map<number, number>;
  /** Count of inventorySaveDatas slots with IsUnlock true. */
  inventoryCapacity: number;
  /** Count of unlocked slots holding an item (ItemUniqueId !== 0). */
  inventoryUsed: number;
  /**
   * Parse-time only: catalog ids with pipeline (…900) rows and no assignable
   * itemSaveDatas instances. Used by resolve; not sent over IPC (renderer gets
   * ResolvedInventory).
   */
  marketPipelineOnlyCatalogKeys?: ReadonlySet<number>;
}

// Owned items grouped by ItemKey and resolved against the game catalog.
export interface BuyOrderLevel {
  price: number;
  quantity: number;
}

export interface ResolvedInventoryRow {
  itemKey: number;
  name: string; // "Unknown #<key>" when not in the catalog
  grade: string;
  type: string; // GEAR | MATERIAL | ...
  level: number | null;
  marketTradable: boolean;
  marketHashName: string | null;
  count: number;
  inUseCount: number;
  chaoticCount: number;
  known: boolean;
  priceRaw: string | null;
  rawMedian: string | null;
  rawLowest: string | null;
  unitPrice: number | null;
  priceSource: "median" | "lowest" | null;
  /** True when Steam was queried for this hash (even if no listing/sale price came back). */
  priceChecked: boolean;
  value: number | null;
  buyOrderRaw: string | null;
  buyOrderUnit: number | null;
  /** Units on the book at the highest buy price (from histogram). */
  buyOrderQuantity: number | null;
  /** Full buy-side order book, sorted descending by price. */
  buyOrderLevels: BuyOrderLevel[] | null;
  buyOrderValue: number | null;
  /** Units actually covered by buyOrderValue, capped at count (may be less than count if the book runs dry). */
  buyOrderCoveredCount: number | null;
  /** True when buy-order histogram was queried for this hash. */
  buyOrderChecked: boolean;
  inventoryCount: number;
  stashCount: number;
  tradingCount: number;
}

export interface InventoryPriceInfo {
  median: number | null;
  lowest: number | null;
  rawMedian: string | null;
  rawLowest: string | null;
  buyOrder: number | null;
  rawBuyOrder: string | null;
  /** Units available at the highest buy price (histogram depth). */
  buyOrderQuantity?: number | null;
  /** Full buy-side order book, sorted descending by price. */
  buyOrderLevels?: BuyOrderLevel[] | null;
  /** True after a successful itemordershistogram response (including zero buy orders). */
  buyOrderFetched?: boolean;
}

export interface InventoryComposition {
  total: number;
  byGrade: Record<string, number>;
  byType: Record<string, number>;
  tradableCount: number;
  unknownCount: number;
  chaoticCount: number;
  inUseCount: number;
  priceableCount: number;
  valuedTotal: number;
  feeTotal: number;
  netAfterFeesTotal: number;
  buyOrderValuedTotal: number;
  /** Distinct priced rows with a non-null buy order unit. */
  buyOrderPricedRows: number;
  currency: string | null;
}

export interface ResolvedInventory {
  rows: ResolvedInventoryRow[];
  composition: InventoryComposition;
  chests: ChestHolding[];
  saveMtime: number;
  gameDataLoaded: boolean;
  currency: string | null;
  inventoryCapacity: number;
  inventoryUsed: number;
}

export interface PriceStatus {
  currency: string;
  /** Cached entries for owned market targets (after prune). */
  count: number;
  /** Unique market hash names for current inventory. */
  ownedTargets: number;
  /** Owned targets with cache younger than 24h. */
  freshCount: number;
  /** Owned targets needing a fetch. */
  staleCount: number;
  fetchedUtc: string | null;
  running: boolean;
}

export type PriceRefreshSummary = Pick<
  PriceRefreshResult,
  "priced" | "skipped" | "failed" | "stopped" | "noop" | "queued"
>;

export interface PriceProgress {
  done: number;
  total: number;
  current: string;
  priced: number;
  failed: number;
  /** Main sends this when a background price run ends or is cancelled. */
  finished?: boolean;
  result?: PriceRefreshSummary;
}

export interface PriceRefreshResult {
  ok: boolean;
  priced: number;
  skipped: number;
  failed: number;
  stopped: "completed" | "cancelled" | "rate-limited";
  currency: string;
  error?: string;
  /** All owned targets already fresh — no fetch started. */
  noop?: boolean;
  /** Refresh deferred until the current run finishes. */
  queued?: boolean;
}

/**
 * Shared Lookup price snapshot: a single file built server-side (GitHub Action)
 * holding USD listed prices for every priceable catalog item plus an FX table,
 * so the app prices the whole Lookup catalog from one download with no Steam
 * calls. Distinct from the owned-inventory price cache (`prices.{CUR}.json`).
 */
export interface LookupPriceSnapshot {
  schemaVersion: 1;
  /** ISO timestamp the snapshot was generated; drives "updated {age} ago". */
  generatedUtc: string;
  baseCurrency: "USD";
  /** market_hash_name -> lowest active listing in USD; null = no active listing. */
  prices: Record<string, number | null>;
  /** market_hash_name -> ISO time that price was last fetched; drives rolling refresh. */
  fetchedUtc?: Record<string, string>;
  /** ISO currency code -> units per 1 USD (e.g. BRL: 5.1). */
  fx: Record<string, number>;
}

/** Work area snapshot used to match a monitor across restarts. */
export interface DisplayWorkArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Saved window position relative to a display work area (not global desktop coords). */
export interface WindowLayoutEntry {
  x: number;
  y: number;
  width?: number;
  height?: number;
  displayId: number;
  displayWorkArea: DisplayWorkArea;
}

export interface WindowLayoutPrefs {
  main?: WindowLayoutEntry;
  overlay?: Omit<WindowLayoutEntry, "width" | "height">;
  boxTracker?: WindowLayoutEntry;
}

export type InventoryColumnId =
  | "grade"
  | "level"
  | "type"
  | "location"
  | "inUse"
  | "marketPrice"
  | "listValue"
  | "instantSell"
  | "instantTotal"
  | "instantSellAverage";

export interface InventoryTablePrefs {
  visibleColumns: InventoryColumnId[];
}

export interface ChestAutoOpenPrefs {
  common: boolean;
  stageBoss: boolean;
}

/** Opt-in live game-memory reader preferences (off by default). */
export interface LiveMemoryPrefs {
  /** Reader enabled — when false no reader process runs and the app is save-only. */
  enabled: boolean;
  /** The one-time read-only consent dialog has been accepted. Gates first enable. */
  consentAccepted: boolean;
}

export interface AppConfig {
  savePath: string;
  es3Password: string;
  pollIntervalSeconds: number;
  rollingWindowMinutes: number;
  startTopmost: boolean;
  logHistoryCsv: boolean;
  currency: string;
  notificationsEnabled: boolean;
  notifyOnUpdateAvailable: boolean;
  notificationVolume: number;
  notificationPrefs: NotificationPrefs;
  inventoryAlmostFullThresholdPercent: number;
  chestAutoOpenEnabled: ChestAutoOpenPrefs;
  liveMemory: LiveMemoryPrefs;
  windowLayout?: WindowLayoutPrefs;
  inventoryTable?: InventoryTablePrefs;
}

/** Scoped targets for Settings → Data & cache clear actions. */
export type AppDataClearTarget =
  | "prices"
  | "lookup-prices"
  | "box-timers"
  | "session"
  | "all-except-config";

/** A `LookupItem` resolved against the price snapshot for display. */
export interface ResolvedLookupPrice {
  /** market_hash_name, or null when the item isn't priceable/tradable. */
  hash: string | null;
  /** priced = has a USD listing; no-listing = tradable but no active listing; not-tradable = no affordance. */
  state: "priced" | "no-listing" | "not-tradable";
  /** USD lowest listing from the snapshot (null unless state === "priced"). */
  usd: number | null;
  /** Amount converted to the display currency (null unless priced). */
  amount: number | null;
  /** Formatted display string in the user's currency (null unless priced). */
  display: string | null;
  /** Steam Market listing URL for the hash (null when not-tradable). */
  listingUrl: string | null;
}

export interface AppDataPathEntry {
  id: AppDataClearTarget | "config" | "diagnostic-log";
  label: string;
  files: string[];
  exists: boolean;
}

export interface ClearDiagnosticLogResult {
  ok: boolean;
  cleared: string[];
  error?: string;
}

export interface RendererLogPayload {
  source: string;
  message: string;
  stack?: string;
}

export interface AppDataPaths {
  userDataDir: string;
  configPath: string;
  diagnosticLogPath: string;
  entries: AppDataPathEntry[];
}

export interface ClearAppDataResult {
  ok: boolean;
  cleared: string[];
  error?: string;
}

// --- Chests (BoxData holdings) ---

export interface ResolvedChestRow {
  boxType: number;
  label: string;
  category: string;
  quantity: number;
}

export interface BoxSlotStatus {
  quantity: number;
  capacity: number;
  isFull: boolean;
  slotsRemaining: number;
}

/** @deprecated use BoxSlotStatus */
export type CommonBoxStatus = BoxSlotStatus;

export interface ChestCapacityBreakdown {
  base: number;
  runeBonus: number;
  purchasedCapRuneNodes: number;
  runeLabel: string;
}

/** @deprecated use ChestCapacityBreakdown */
export type CommonCapacityBreakdown = ChestCapacityBreakdown;

export interface ChestState {
  rows: ResolvedChestRow[];
  common: BoxSlotStatus;
  stageBoss: BoxSlotStatus;
  actBoss: BoxSlotStatus;
  capacity: {
    common: ChestCapacityBreakdown;
    stageBoss: ChestCapacityBreakdown;
    actBoss: ChestCapacityBreakdown;
    totalRunePurchases: number;
  };
  /** Effective seconds to auto-open one chest of each type (base minus rune reduction). */
  autoOpen: {
    common: number;
    stageBoss: number;
    actBoss: number;
  };
  totalHeld: number;
  saveMtime: number;
  /** @deprecated use capacity.common.runeBonus */
  runeBonusSlots: number;
}

// --- Pets ---

export interface PetAppearStage {
  act: number;
  stage: number;
  name: string;
  label: string;
}

export interface PetBestStage {
  stageKey: number;
  difficultyLabel: string;
  locationName: string;
  spawnPercent: number;
  expectedKillsPerClear: number;
  /** Present while the pet is still locked — clears needed on this stage. */
  runsMessage?: string;
}

export interface PetRow {
  petKey: number;
  name: string;
  unlocked: boolean;
  equipped: boolean;
  unlockKind: "kills" | "dlc";
  killCount?: number;
  killTarget?: number;
  killsRemaining?: number;
  progressPct?: number;
  bonuses: string[];
  dlcLabel?: string;
  appearsOnStages?: PetAppearStage[];
  bestStages?: PetBestStage[];
}

export interface PetState {
  pets: PetRow[];
  saveMtime: number;
  arrangedPetKey: number;
  unlockKillCount: number;
  dlcLabel: string;
}

// --- Box tracker (manual rare boss box timers) ---

export type BoxTrackerSortOrder = "cooldown-first" | "ready-first";

export interface BoxTimerFarmStageOption {
  stageKey: number;
  label: string;
}

export interface BoxTimerRow {
  boxId: number;
  name: string;
  level: number | null;
  idealStageKey: number;
  idealStageLabel: string;
  cooldownSeconds: number;
  cooldownIsCustom: boolean;
  active: boolean;
  remainingSeconds: number;
  progress: number;
  status: "ready" | "cooldown";
  atIdealStage: boolean;
}

export interface BoxTimerCatalogEntry {
  boxId: number;
  name: string;
  level: number | null;
  idealStageKey: number;
  idealStageLabel: string;
  defaultIdealStageKey: number;
  defaultIdealStageLabel: string;
  idealStageIsCustom: boolean;
  farmStageOptions: BoxTimerFarmStageOption[];
  dropStageRangeLabel: string;
  cooldownSeconds: number;
  cooldownIsCustom: boolean;
  enabled: boolean;
  notifyWhenReady: boolean;
}

export interface BoxTimerState {
  rows: BoxTimerRow[];
  catalog: BoxTimerCatalogEntry[];
  enabledCount: number;
  readyCount: number;
  cooldownCount: number;
  sortOrder: BoxTrackerSortOrder;
  currentStageKey: number;
  defaultCooldownSeconds: number;
  playerLogPath: string;
  playerLogAvailable: boolean;
}

export type UpdatePhase =
  | "idle"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "ready"
  | "error"
  | "disabled";

export interface UpdateStatus {
  phase: UpdatePhase;
  currentVersion: string;
  availableVersion?: string;
  percent?: number;
  transferred?: number;
  total?: number;
  error?: string;
  lastCheckedAt?: string;
}

// --- Lookup tab (bundled item/source catalog) ---

export interface LookupStatRow {
  stat: string;
  mod: string;
  value: number;
  display: string;
}

export interface LookupUniqueMod {
  key: number;
  mod: string;
  text: string;
}

export interface LookupGearStats {
  base: LookupStatRow[];
  inherent: LookupStatRow[];
  unique: LookupUniqueMod | null;
}

export interface LookupMaterialOutcome {
  stat: string;
  mod: string;
  tier: number;
  rawMin: number;
  rawMax: number;
  displayMin: number;
  displayMax: number;
  displayText: string;
}

export interface LookupMaterialGearGroup {
  gearGroup: string;
  outcomes: LookupMaterialOutcome[];
}

export interface LookupItem {
  id: number;
  name: string;
  grade: string;
  type: "GEAR" | "MATERIAL";
  gearType: string | null;
  gearGroup: string | null;
  materialType: string | null;
  level: number | null;
  iconPath: string;
  marketTradable: boolean;
  stats?: LookupGearStats;
  gearGroups?: LookupMaterialGearGroup[];
}

export interface LookupDropEntry {
  via: string;
  boxItemKey: number;
  boxName: string;
  grade: string | null;
  dropPct: number;
}

export interface LookupCraftingEntry {
  recipeKey: number;
  tier: number;
  craftingType: string;
  level: { min: number; max: number };
  materials: { itemKey: number; name: string; amount: number }[];
  outputPct: number;
}

export interface LookupUsedInOutput {
  itemKey: number;
  poolPct: number;
}

export interface LookupUsedInEntry {
  recipeKey: number;
  craftingType: string;
  tier: number;
  level: { min: number; max: number };
  materials: { itemKey: number; name: string; amount: number }[];
  outputs: LookupUsedInOutput[];
}

export interface LookupItemSources {
  drops: LookupDropEntry[];
  crafting: LookupCraftingEntry[];
  /** Crafting recipes that consume this material (MATERIAL items only). */
  usedIn?: LookupUsedInEntry[];
}

// --- Synthesis model (bundled synthesis_model.json + core/lookup/synthesis.ts) ---

export interface SynthesisGradeWeights {
  value: number;
  weights: [number, number, number, number, number];
  total: number;
}

export interface SynthesisRecipeRow {
  recipeTier: number;
  inputGrade: string;
  minMaterialTier: number;
  minMaterialAverageLevel: number;
  /** Precomputed in tbh-data; optional until synthesis_model.json is regenerated. */
  materialAvgLevelMin?: number;
  materialAvgLevelMax?: number;
  minResultLevel: number;
  maxResultLevel: number;
  materialAmount: number;
  levelWeights: number[];
}

export interface SynthesisBucketEntry {
  itemKey: number;
  poolPct: number;
}

export interface SynthesisModel {
  gradeWeights: Record<string, SynthesisGradeWeights>;
  recipesByType: Record<string, SynthesisRecipeRow[]>;
  buckets: Record<string, SynthesisBucketEntry[]>;
}

export interface SynthesisPathToItem {
  inputGrade: string;
  gradeStep: number;
  tier: number;
  minMaterialTier: number;
  materialAvgLevel: number;
  materialAvgLevelMin: number;
  materialAvgLevelMax: number;
  materialAmount: number;
  resultLevelMin: number;
  resultLevelMax: number;
  itemLevel: number;
  pGrade: number;
  pLevel: number;
  itemPoolPct: number;
  chance: number;
}

export interface SynthesisSimOutcome {
  outputGrade: string;
  level: number;
  itemKey: number;
  chance: number;
}

export interface LookupBoxDrop {
  itemKey: number;
  name: string;
  grade: string;
  dropPct: number;
}

export type LookupBoxDropVia = "monster_box" | "boss_box" | "act_boss";

export type LookupBoxCategory = "common" | "stage_boss" | "act_boss" | "unknown";

export interface LookupBoxStageRef {
  stageKey: number;
  stageName: string;
  via: LookupBoxDropVia;
  /** Spawn chance % (converted at tbh-data extract). Act boss = 100. */
  spawnPct: number;
}

export interface LookupBoxFirstDropStageRef {
  stageKey: number;
  stageName: string;
}

export interface LookupBoxSources {
  name: string;
  grade: string | null;
  category: LookupBoxCategory;
  drops: LookupBoxDrop[];
  stages: LookupBoxStageRef[];
  dropStageRangeLabel: string;
  firstDropOnly: boolean;
  firstDropStages: LookupBoxFirstDropStageRef[];
}

export interface LookupStageBoxRef {
  boxItemKey: number;
  name: string;
  grade: string | null;
}

export interface LookupStageSources {
  monsters: string[];
  boxes: LookupStageBoxRef[];
}

export interface LookupSources {
  items: Record<string, LookupItemSources>;
  boxes: Record<string, LookupBoxSources>;
  stages: Record<string, LookupStageSources>;
}

// --- Offerings (bundled offerings.json + core/lookup/offerings.ts) ---

export interface OfferingLootEntry {
  itemKey: number;
  poolPct: number;
}

export interface OfferingEntry {
  coinKey: number;
  goldCost: number;
  unlockCubeLevel: number;
  loot: OfferingLootEntry[];
}

export type OfferingsModel = OfferingEntry[];

/** Reverse lookup: a coin that can yield a given item, and at what chance. */
export interface OfferingSource {
  coinKey: number;
  poolPct: number;
}

// --- Live memory reader ---

/**
 * A live read from game process memory (read-only). Per-stat: a `null` field
 * means "no live value this tick" — the renderer falls back to the save value.
 * Phase 1 emits stage only; more stats join in later phases.
 */
export interface LiveMemorySnapshot {
  /** The reader produced a live read this tick. */
  connected: boolean;
  /** Live current stage key (null ⇒ fall back to the save value). */
  stageKey: number | null;
  /** Live current wave within the stage. */
  stageWave: number | null;
  /** Human-readable source, e.g. "memory v1.00.21". */
  source: string;
  /** Duration of the last snapshot read in ms (per-tick cost, diagnostics). */
  readMs: number;
  /** Epoch ms when the read was taken. */
  at: number;
}

/** Reader lifecycle/attach state for the status indicator + diagnostics. */
export interface LiveMemoryStatus {
  /** The reader process is up. */
  running: boolean;
  /** Attached to the game process. */
  attached: boolean;
  pid: number | null;
  /** Detected game version (from Version.txt). */
  gameVersion: string | null;
  /** Bundled offsets exist for the detected version. */
  supported: boolean;
  /** e.g. "live stats unavailable for game v1.00.99". */
  note?: string;
}

// API surface exposed on `window.tbh` by the preload via contextBridge.
export interface TbhApi {
  onStats(cb: (stats: Stats) => void): () => void;
  reset(): void;
  getStats(): Promise<Stats | null>;
  openOverlay(): void;
  showMain(): void;
  closeOverlay(): void;
  getInventory(): Promise<ResolvedInventory | null>;
  onInventory(cb: (inv: ResolvedInventory) => void): () => void;
  pricesStatus(): Promise<PriceStatus>;
  refreshPrices(force?: boolean): Promise<PriceRefreshResult & { status: PriceStatus }>;
  refreshItemPrices(itemKey: number): Promise<PriceRefreshResult & { status: PriceStatus }>;
  cancelPrices(): void;
  setCurrency(iso: string): Promise<PriceStatus>;
  onPricesProgress(cb: (p: PriceProgress) => void): () => void;
  onPriceStatus(cb: (status: PriceStatus) => void): () => void;
  getConfig(): Promise<AppConfig>;
  saveConfig(patch: Partial<AppConfig>): Promise<AppConfig>;
  pickSaveFile(): Promise<string | null>;
  getDataPaths(): Promise<AppDataPaths>;
  clearAppData(target: AppDataClearTarget): Promise<ClearAppDataResult>;
  clearDiagnosticLogs(): Promise<ClearDiagnosticLogResult>;
  logRendererError(payload: RendererLogPayload): Promise<void>;
  getChests(): Promise<ChestState | null>;
  onChests(cb: (state: ChestState) => void): () => void;
  getPets(): Promise<PetState | null>;
  onPets(cb: (state: PetState) => void): () => void;
  openBoxTracker(): void;
  closeBoxTracker(): void;
  minimizeBoxTracker(): void;
  getBoxTimers(): Promise<BoxTimerState>;
  onBoxTimers(cb: (state: BoxTimerState) => void): () => void;
  markBoxDropped(boxId: number): Promise<BoxTimerState>;
  clearBoxTimer(boxId: number): Promise<BoxTimerState>;
  setBoxTrackerBoxes(boxIds: number[]): Promise<BoxTimerState>;
  setBoxTrackerCooldown(boxId: number, cooldownSeconds: number): Promise<BoxTimerState>;
  clearBoxTrackerCooldown(boxId: number): Promise<BoxTimerState>;
  setBoxTrackerFarmStage(boxId: number, stageKey: number): Promise<BoxTimerState>;
  clearBoxTrackerFarmStage(boxId: number): Promise<BoxTimerState>;
  setBoxTrackerNotify(boxId: number, enabled: boolean): Promise<BoxTimerState>;
  setBoxTrackerSortOrder(sortOrder: BoxTrackerSortOrder): Promise<BoxTimerState>;
  onPlayNotificationSound(cb: (payload: NotificationSoundPayload) => void): () => void;
  getUpdateStatus(): Promise<UpdateStatus>;
  checkForUpdates(): Promise<UpdateStatus>;
  downloadUpdate(): Promise<UpdateStatus>;
  quitAndInstall(): Promise<void>;
  onUpdateStatus(cb: (status: UpdateStatus) => void): () => void;
  getLookupCatalog(): Promise<LookupItem[]>;
  getLookupSources(): Promise<LookupSources>;
  getLookupSynthesisModel(): Promise<SynthesisModel>;
  getOfferings(): Promise<OfferingsModel>;
  getLookupPrices(): Promise<LookupPriceSnapshot | null>;
  onLookupPrices(cb: (snapshot: LookupPriceSnapshot | null) => void): () => void;
}
