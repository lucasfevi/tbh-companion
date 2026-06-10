// Session and rate tracking for XP and gold gained over time.
// Ported faithfully from tbh_xp/tracker.py - see that file's docstring for the
// two design points that keep the rates honest:
//   1. Rates are measured against the save file's modification time (mtime),
//      not poll time, so they don't decay between the game's periodic writes.
//   2. Rates are only recomputed when the value actually changes, and held
//      constant otherwise.
// Absolute values are never trusted to be monotonic (HeroExp resets on
// level-up, gold is spent) - only positive deltas are accumulated.

import type {
  SaveSnapshot,
  HeroSnapshot,
  HistoryEntry,
  TrackerRateMeterSnapshot,
  TrackerSnapshot,
} from "../../shared/types";

const HISTORY_LIMIT = 500;

function nowSeconds(): number {
  return Date.now() / 1000;
}

class RateMeter {
  readonly window: number;
  gained = 0;
  rolling = 0;
  private samples: Array<[number, number]> = []; // [mtime, gained]

  constructor(window: number) {
    this.window = window;
  }

  init(mtime: number): void {
    this.samples.push([mtime, 0]);
  }

  add(gain: number, mtime: number): void {
    if (gain <= 0) return;
    this.gained += gain;
    this.samples.push([mtime, this.gained]);
    while (this.samples.length > 2 && mtime - this.samples[0][0] > this.window) {
      this.samples.shift();
    }
    if (this.samples.length >= 2) {
      const [t0, g0] = this.samples[0];
      const [t1, g1] = this.samples[this.samples.length - 1];
      const dt = t1 - t0;
      if (dt > 0) this.rolling = ((g1 - g0) / dt) * 3600;
    }
  }

  toSnapshot(): TrackerRateMeterSnapshot {
    return {
      window: this.window,
      gained: this.gained,
      rolling: this.rolling,
      samples: this.samples.map(([t, g]) => [t, g] as [number, number]),
    };
  }

  static fromSnapshot(data: TrackerRateMeterSnapshot): RateMeter {
    const meter = new RateMeter(data.window);
    meter.gained = data.gained;
    meter.rolling = data.rolling;
    meter.samples = data.samples.map(([t, g]) => [t, g] as [number, number]);
    return meter;
  }
}

function deltaGain(prev: number | undefined, current: number): number {
  if (prev === undefined) return 0;
  const d = current - prev;
  if (d >= 0) return d;
  // Value dropped -> treat as a reset (e.g. level-up). Count what's accrued.
  return Math.max(current, 0);
}

export class XpTracker {
  readonly rollingWindow: number;
  readonly trackCube: boolean;

  onHistory: ((entry: HistoryEntry) => void) | null = null;

  // Session / XP state (initialized in reset()).
  sessionStart!: number;
  cumulativeGained!: number;
  currentTotalXp!: number;
  currentGold!: number;
  goldGained!: number;
  heroes!: HeroSnapshot[];
  history!: HistoryEntry[];
  private lastGainMtime!: number | null;

  private prevHero!: Map<string, number>;
  private heroMeters!: Map<string, RateMeter>;
  private prevCube!: number | null;
  private samples!: Array<[number, number]>;
  private initialized!: boolean;
  private firstMtime!: number | null;
  private lastChangeMtime!: number | null;
  private rollingRateValue!: number;
  private sessionRateValue!: number;

  // Gold state.
  private prevGold!: number | null;
  private goldSamples!: Array<[number, number]>;
  private goldFirstMtime!: number | null;
  private goldLastChangeMtime!: number | null;
  private goldRollingRateValue!: number;
  private goldSessionRateValue!: number;

  constructor(rollingWindowSeconds = 300, trackCube = false) {
    this.rollingWindow = Math.max(10, rollingWindowSeconds);
    this.trackCube = trackCube;
    this.reset();
  }

  reset(): void {
    const now = nowSeconds();
    this.sessionStart = now;
    this.cumulativeGained = 0;
    this.prevHero = new Map();
    this.heroMeters = new Map();
    this.prevCube = null;
    this.samples = [];
    this.initialized = false;
    this.firstMtime = null;
    this.lastChangeMtime = null;
    this.currentTotalXp = 0;
    this.lastGainMtime = null;
    this.heroes = [];
    this.rollingRateValue = 0;
    this.sessionRateValue = 0;
    this.history = [];

    this.currentGold = 0;
    this.goldGained = 0;
    this.prevGold = null;
    this.goldSamples = [];
    this.goldFirstMtime = null;
    this.goldLastChangeMtime = null;
    this.goldRollingRateValue = 0;
    this.goldSessionRateValue = 0;
  }

  /** Incorporate a new snapshot. Returns XP gained since last update. */
  update(snap: SaveSnapshot): number {
    const now = nowSeconds();
    const mtime = snap.saveMtime || now;
    this.heroes = snap.heroes;
    this.currentTotalXp = snap.totalHeroExp + (this.trackCube ? snap.cubeExp : 0);
    this.currentGold = snap.gold;

    if (!this.initialized) {
      for (const h of snap.heroes) {
        this.prevHero.set(h.key, h.exp);
        const meter = new RateMeter(this.rollingWindow);
        meter.init(mtime);
        this.heroMeters.set(h.key, meter);
      }
      this.prevCube = snap.cubeExp;
      this.prevGold = snap.gold;
      this.initialized = true;
      this.firstMtime = mtime;
      this.lastChangeMtime = mtime;
      this.samples.push([mtime, 0]);
      this.goldFirstMtime = mtime;
      this.goldLastChangeMtime = mtime;
      this.goldSamples.push([mtime, 0]);
      return 0;
    }

    this.updateGold(snap.gold, mtime);

    let gain = 0;
    for (const h of snap.heroes) {
      const heroGain = deltaGain(this.prevHero.get(h.key), h.exp);
      gain += heroGain;
      this.prevHero.set(h.key, h.exp);
      let meter = this.heroMeters.get(h.key);
      if (meter === undefined) {
        meter = new RateMeter(this.rollingWindow);
        meter.init(mtime);
        this.heroMeters.set(h.key, meter);
      }
      meter.add(heroGain, mtime);
    }

    if (this.trackCube) {
      gain += deltaGain(this.prevCube ?? undefined, snap.cubeExp);
      this.prevCube = snap.cubeExp;
    }

    if (gain > 0) {
      this.cumulativeGained += gain;
      this.lastGainMtime = mtime;
      this.lastChangeMtime = mtime;
      this.samples.push([mtime, this.cumulativeGained]);
      this.prune(mtime);
      this.recomputeRates();

      const entry: HistoryEntry = {
        wallTime: now,
        delta: gain,
        rate: this.rollingRateValue,
        totalXp: this.currentTotalXp,
        stageKey: snap.stageKey,
        stageWave: snap.stageWave,
      };
      this.history.push(entry);
      if (this.history.length > HISTORY_LIMIT) this.history.shift();
      if (this.onHistory) {
        try {
          this.onHistory(entry);
        } catch {
          // never let logging break tracking
        }
      }
    }

    return gain;
  }

  private updateGold(gold: number, mtime: number): void {
    // Gold is spent as well as earned; count only positive changes (earned).
    const gain = this.prevGold !== null ? gold - this.prevGold : 0;
    this.prevGold = gold;
    if (gain <= 0) return;
    this.goldGained += gain;
    this.goldLastChangeMtime = mtime;
    this.goldSamples.push([mtime, this.goldGained]);
    while (this.goldSamples.length > 2 && mtime - this.goldSamples[0][0] > this.rollingWindow) {
      this.goldSamples.shift();
    }
    if (this.goldSamples.length >= 2) {
      const [t0, g0] = this.goldSamples[0];
      const [t1, g1] = this.goldSamples[this.goldSamples.length - 1];
      const dt = t1 - t0;
      if (dt > 0) this.goldRollingRateValue = ((g1 - g0) / dt) * 3600;
    }
    if (this.goldFirstMtime !== null && this.goldLastChangeMtime !== null) {
      const span = this.goldLastChangeMtime - this.goldFirstMtime;
      if (span > 0) this.goldSessionRateValue = (this.goldGained / span) * 3600;
    }
  }

  private prune(refMtime: number): void {
    while (this.samples.length > 2 && refMtime - this.samples[0][0] > this.rollingWindow) {
      this.samples.shift();
    }
  }

  private recomputeRates(): void {
    if (this.samples.length >= 2) {
      const [t0, g0] = this.samples[0];
      const [t1, g1] = this.samples[this.samples.length - 1];
      const dt = t1 - t0;
      if (dt > 0) this.rollingRateValue = ((g1 - g0) / dt) * 3600;
    }
    if (this.firstMtime !== null && this.lastChangeMtime !== null) {
      const span = this.lastChangeMtime - this.firstMtime;
      if (span > 0) this.sessionRateValue = (this.cumulativeGained / span) * 3600;
    }
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  get elapsed(): number {
    return nowSeconds() - this.sessionStart;
  }

  get sessionRate(): number {
    return this.sessionRateValue;
  }

  get rollingRate(): number {
    return this.rollingRateValue;
  }

  heroRate(key: string): number {
    const meter = this.heroMeters.get(key);
    return meter ? meter.rolling : 0;
  }

  get goldRollingRate(): number {
    return this.goldRollingRateValue;
  }

  get goldSessionRate(): number {
    return this.goldSessionRateValue;
  }

  /** Seconds since the save file mtime when XP last changed (not every read). */
  get secondsSinceGain(): number | null {
    if (this.lastGainMtime === null) return null;
    return nowSeconds() - this.lastGainMtime;
  }

  /** Capture tracker internals for session persistence. */
  captureSnapshot(): TrackerSnapshot {
    const heroMeters: Record<string, TrackerRateMeterSnapshot> = {};
    for (const [key, meter] of this.heroMeters) {
      heroMeters[key] = meter.toSnapshot();
    }
    return {
      sessionStart: this.sessionStart,
      cumulativeGained: this.cumulativeGained,
      currentTotalXp: this.currentTotalXp,
      currentGold: this.currentGold,
      goldGained: this.goldGained,
      heroes: this.heroes.map((h) => ({ ...h })),
      history: this.history.map((e) => ({ ...e })),
      lastGainMtime: this.lastGainMtime,
      prevHero: Object.fromEntries(this.prevHero),
      heroMeters,
      prevCube: this.prevCube,
      samples: this.samples.map(([t, g]) => [t, g] as [number, number]),
      initialized: this.initialized,
      firstMtime: this.firstMtime,
      lastChangeMtime: this.lastChangeMtime,
      rollingRateValue: this.rollingRateValue,
      sessionRateValue: this.sessionRateValue,
      prevGold: this.prevGold,
      goldSamples: this.goldSamples.map(([t, g]) => [t, g] as [number, number]),
      goldFirstMtime: this.goldFirstMtime,
      goldLastChangeMtime: this.goldLastChangeMtime,
      goldRollingRateValue: this.goldRollingRateValue,
      goldSessionRateValue: this.goldSessionRateValue,
    };
  }

  /** Restore tracker internals from a captured snapshot (expects matching rollingWindow/trackCube). */
  applySnapshot(snapshot: TrackerSnapshot): void {
    this.sessionStart = snapshot.sessionStart;
    this.cumulativeGained = snapshot.cumulativeGained;
    this.currentTotalXp = snapshot.currentTotalXp;
    this.currentGold = snapshot.currentGold;
    this.goldGained = snapshot.goldGained;
    this.heroes = snapshot.heroes.map((h) => ({ ...h }));
    this.history = snapshot.history.map((e) => ({ ...e }));
    this.lastGainMtime = snapshot.lastGainMtime;
    this.prevHero = new Map(Object.entries(snapshot.prevHero).map(([k, v]) => [k, v]));
    this.heroMeters = new Map(
      Object.entries(snapshot.heroMeters).map(
        ([key, data]) => [key, RateMeter.fromSnapshot(data)] as const,
      ),
    );
    this.prevCube = snapshot.prevCube;
    this.samples = snapshot.samples.map(([t, g]) => [t, g] as [number, number]);
    this.initialized = snapshot.initialized;
    this.firstMtime = snapshot.firstMtime;
    this.lastChangeMtime = snapshot.lastChangeMtime;
    this.rollingRateValue = snapshot.rollingRateValue;
    this.sessionRateValue = snapshot.sessionRateValue;
    this.prevGold = snapshot.prevGold;
    this.goldSamples = snapshot.goldSamples.map(([t, g]) => [t, g] as [number, number]);
    this.goldFirstMtime = snapshot.goldFirstMtime;
    this.goldLastChangeMtime = snapshot.goldLastChangeMtime;
    this.goldRollingRateValue = snapshot.goldRollingRateValue;
    this.goldSessionRateValue = snapshot.goldSessionRateValue;
  }
}
