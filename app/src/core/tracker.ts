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

// While live-memory frames keep arriving (~25 Hz), the live path owns XP/gold and
// the save path must not also process them — save `HeroExp` and runtime `HeroRuntime`
// exp are different quantities, so cross-diffing them inflates session totals.
// Session gain uses party total runtime exp delta; per-hero meters still drive the
// heroes panel. See `LiveSessionMeter` (shared with gold).
const LIVE_TAKEOVER_SEC = 5;

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
    this.refreshRolling(mtime);
  }

  /** Recompute rolling rate at `refMtime` (live path: call every tick). */
  refreshRolling(refMtime: number): void {
    while (this.samples.length > 2 && refMtime - this.samples[0][0] > this.window) {
      this.samples.shift();
    }
    if (this.samples.length === 0) return;
    const [t0, g0] = this.samples[0];
    const dt = refMtime - t0;
    if (dt > 0) this.rolling = ((this.gained - g0) / dt) * 3600;
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

/** Rolling + session rates for one live metric (XP or gold), refreshed every tick. */
class LiveSessionMeter {
  sessionTotal = 0;
  samples: Array<[number, number]> = [];
  firstAnchor: number | null = null;
  rolling = 0;
  sessionRate = 0;

  takeover(wallTimeSec: number): void {
    this.firstAnchor = wallTimeSec;
    this.samples = [[wallTimeSec, this.sessionTotal]];
  }

  applyGain(wallTimeSec: number, gain: number): void {
    if (gain <= 0) return;
    this.sessionTotal += gain;
    this.samples.push([wallTimeSec, this.sessionTotal]);
  }

  refresh(wallTimeSec: number, window: number): void {
    while (this.samples.length > 2 && wallTimeSec - this.samples[0][0] > window) {
      this.samples.shift();
    }
    if (this.samples.length >= 1) {
      const [t0, g0] = this.samples[0];
      const dt = wallTimeSec - t0;
      if (dt > 0) this.rolling = ((this.sessionTotal - g0) / dt) * 3600;
    }
    if (this.firstAnchor !== null) {
      const span = wallTimeSec - this.firstAnchor;
      if (span > 0) this.sessionRate = (this.sessionTotal / span) * 3600;
    }
  }

  restore(
    sessionTotal: number,
    samples: Array<[number, number]>,
    firstAnchor: number | null,
    rolling: number,
    sessionRate: number,
  ): void {
    this.sessionTotal = sessionTotal;
    this.samples = samples.map(([t, g]) => [t, g] as [number, number]);
    this.firstAnchor = firstAnchor;
    this.rolling = rolling;
    this.sessionRate = sessionRate;
  }

  capture(): {
    sessionTotal: number;
    samples: Array<[number, number]>;
    firstAnchor: number | null;
    rolling: number;
    sessionRate: number;
  } {
    return {
      sessionTotal: this.sessionTotal,
      samples: this.samples.map(([t, g]) => [t, g] as [number, number]),
      firstAnchor: this.firstAnchor,
      rolling: this.rolling,
      sessionRate: this.sessionRate,
    };
  }
}

export class XpTracker {
  readonly rollingWindow: number;

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
  private samples!: Array<[number, number]>;
  private initialized!: boolean;
  private prevLiveTotalXp: number | null = null;

  private readonly liveXp = new LiveSessionMeter();
  private readonly liveGold = new LiveSessionMeter();

  // Live-vs-save source ownership, tracked per metric (see LIVE_TAKEOVER_SEC).
  private xpLiveOwning!: boolean;
  private goldLiveOwning!: boolean;
  private lastLiveXpSec!: number | null;
  private lastLiveGoldSec!: number | null;
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

  constructor(rollingWindowSeconds = 300) {
    this.rollingWindow = Math.max(10, rollingWindowSeconds);
    this.reset();
  }

  reset(): void {
    const now = nowSeconds();
    this.sessionStart = now;
    this.cumulativeGained = 0;
    this.prevHero = new Map();
    this.heroMeters = new Map();
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
    this.xpLiveOwning = false;
    this.goldLiveOwning = false;
    this.lastLiveXpSec = null;
    this.lastLiveGoldSec = null;

    this.currentGold = 0;
    this.goldGained = 0;
    this.prevGold = null;
    this.goldSamples = [];
    this.goldFirstMtime = null;
    this.goldLastChangeMtime = null;
    this.goldRollingRateValue = 0;
    this.goldSessionRateValue = 0;
    this.prevLiveTotalXp = null;
    this.liveXp.restore(0, [], null, 0, 0);
    this.liveGold.restore(0, [], null, 0, 0);
  }

  /** Incorporate a new save snapshot. Returns XP gained since last update. */
  update(snap: SaveSnapshot): number {
    const now = nowSeconds();
    const mtime = snap.saveMtime || now;
    this.heroes = snap.heroes;

    if (!this.initialized) {
      for (const h of snap.heroes) {
        this.prevHero.set(h.key, h.exp);
        const meter = new RateMeter(this.rollingWindow);
        meter.init(mtime);
        this.heroMeters.set(h.key, meter);
      }
      this.prevGold = snap.gold;
      this.initialized = true;
      this.firstMtime = mtime;
      this.lastChangeMtime = mtime;
      this.samples.push([mtime, 0]);
      this.goldFirstMtime = mtime;
      this.goldLastChangeMtime = mtime;
      this.goldSamples.push([mtime, 0]);
      this.currentTotalXp = snap.totalHeroExp;
      this.currentGold = snap.gold;
      return 0;
    }

    const goldLiveDriving =
      this.lastLiveGoldSec !== null && now - this.lastLiveGoldSec < LIVE_TAKEOVER_SEC;
    const xpLiveDriving =
      this.lastLiveXpSec !== null && now - this.lastLiveXpSec < LIVE_TAKEOVER_SEC;

    // ── Gold ── save owns it only while the live path isn't driving it.
    if (!goldLiveDriving) {
      if (this.goldLiveOwning) {
        // Handover live → save: re-baseline to the save value, count nothing.
        this.goldLiveOwning = false;
        this.prevGold = snap.gold;
      } else {
        this.updateGold(snap.gold, mtime);
      }
      this.currentGold = snap.gold;
    }

    // ── XP ── save owns it only while the live path isn't driving it.
    let gain = 0;
    if (!xpLiveDriving) {
      if (this.xpLiveOwning) {
        // Handover live → save: re-baseline hero exp to save values, count nothing.
        this.xpLiveOwning = false;
        this.currentTotalXp = snap.totalHeroExp;
        for (const h of snap.heroes) this.prevHero.set(h.key, h.exp);
      } else {
        this.currentTotalXp = snap.totalHeroExp;
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
      }
    }

    return gain;
  }

  /**
   * Feed live memory data at ~25 Hz into the rate meters.
   * Uses wall-time anchors instead of save-mtime. Ignored when not yet initialized
   * (first `update(SaveSnapshot)` must run first to seed the hero/gold meters).
   */
  updateLive(
    data: {
      gold: number | null;
      heroes: Array<{ heroKey: number; level: number; exp: number }> | null;
    },
    wallTimeSec: number,
    stage?: { stageKey: number; stageWave: number },
  ): void {
    if (!this.initialized) return;

    if (data.gold != null) {
      this.applyLiveGold(data.gold, wallTimeSec);
    }

    if (data.heroes != null && data.heroes.length > 0) {
      this.applyLiveXp(data.heroes, wallTimeSec, stage);
    } else if (this.xpLiveOwning) {
      this.syncXpFromLiveMeter(wallTimeSec);
    }
  }

  private applyLiveGold(gold: number, wallTimeSec: number): void {
    this.currentGold = gold;
    const takingOver = !this.goldLiveOwning;
    this.goldLiveOwning = true;
    this.lastLiveGoldSec = wallTimeSec;

    const gain = takingOver ? 0 : Math.max(0, gold - (this.prevGold ?? gold));
    this.prevGold = gold;

    if (takingOver) {
      this.liveGold.restore(this.goldGained, [[wallTimeSec, this.goldGained]], wallTimeSec, 0, 0);
    } else {
      this.liveGold.applyGain(wallTimeSec, gain);
      if (gain > 0) this.goldLastChangeMtime = wallTimeSec;
    }

    this.goldGained = this.liveGold.sessionTotal;
    this.liveGold.refresh(wallTimeSec, this.rollingWindow);
    this.goldRollingRateValue = this.liveGold.rolling;
    this.goldSessionRateValue = this.liveGold.sessionRate;
    this.goldSamples = this.liveGold.samples;
    this.goldFirstMtime = this.liveGold.firstAnchor;
  }

  private applyLiveXp(
    heroes: Array<{ heroKey: number; level: number; exp: number }>,
    wallTimeSec: number,
    stage?: { stageKey: number; stageWave: number },
  ): void {
    const takingOver = !this.xpLiveOwning;
    this.xpLiveOwning = true;
    this.lastLiveXpSec = wallTimeSec;

    let totalXp = 0;
    for (const h of heroes) {
      totalXp += h.exp;
    }

    let gain = 0;

    if (takingOver) {
      this.liveXp.restore(
        this.cumulativeGained,
        [[wallTimeSec, this.cumulativeGained]],
        wallTimeSec,
        0,
        0,
      );
      this.prevHero.clear();
      this.prevLiveTotalXp = totalXp;
      for (const h of heroes) {
        const key = String(h.heroKey);
        this.prevHero.set(key, h.exp);
        let meter = this.heroMeters.get(key);
        if (meter === undefined) {
          meter = new RateMeter(this.rollingWindow);
          meter.init(wallTimeSec);
          this.heroMeters.set(key, meter);
        }
        meter.refreshRolling(wallTimeSec);
      }
    } else {
      gain = deltaGain(this.prevLiveTotalXp ?? undefined, totalXp);
      this.prevLiveTotalXp = totalXp;

      for (const h of heroes) {
        const key = String(h.heroKey);
        const heroGain = deltaGain(this.prevHero.get(key), h.exp);
        this.prevHero.set(key, h.exp);

        let meter = this.heroMeters.get(key);
        if (meter === undefined) {
          meter = new RateMeter(this.rollingWindow);
          meter.init(wallTimeSec);
          this.heroMeters.set(key, meter);
        }
        if (heroGain > 0) meter.add(heroGain, wallTimeSec);
        else meter.refreshRolling(wallTimeSec);
      }

      this.liveXp.applyGain(wallTimeSec, gain);
      if (gain > 0) {
        this.lastGainMtime = wallTimeSec;
        this.lastChangeMtime = wallTimeSec;
      }
    }

    this.currentTotalXp = totalXp;
    this.syncXpFromLiveMeter(wallTimeSec);

    if (gain > 0) {
      const entry: HistoryEntry = {
        wallTime: wallTimeSec,
        delta: gain,
        rate: this.rollingRateValue,
        totalXp: this.currentTotalXp,
        stageKey: stage?.stageKey ?? 0,
        stageWave: stage?.stageWave ?? 0,
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
  }

  private syncXpFromLiveMeter(wallTimeSec: number): void {
    this.cumulativeGained = this.liveXp.sessionTotal;
    this.liveXp.refresh(wallTimeSec, this.rollingWindow);
    this.rollingRateValue = this.liveXp.rolling;
    this.sessionRateValue = this.liveXp.sessionRate;
    this.samples = this.liveXp.samples;
    this.firstMtime = this.liveXp.firstAnchor;
    for (const meter of this.heroMeters.values()) {
      meter.refreshRolling(wallTimeSec);
    }
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

  /** True while live-memory frames are actively driving XP (see LIVE_TAKEOVER_SEC). */
  xpLiveActive(now = nowSeconds()): boolean {
    return this.lastLiveXpSec !== null && now - this.lastLiveXpSec < LIVE_TAKEOVER_SEC;
  }

  /** True while live-memory frames are actively driving gold. */
  goldLiveActive(now = nowSeconds()): boolean {
    return this.lastLiveGoldSec !== null && now - this.lastLiveGoldSec < LIVE_TAKEOVER_SEC;
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

  /** Restore tracker internals from a captured snapshot (expects matching rollingWindow). */
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
    this.liveXp.restore(
      snapshot.cumulativeGained,
      snapshot.samples.map(([t, g]) => [t, g] as [number, number]),
      snapshot.firstMtime,
      snapshot.rollingRateValue,
      snapshot.sessionRateValue,
    );
    this.liveGold.restore(
      snapshot.goldGained,
      snapshot.goldSamples.map(([t, g]) => [t, g] as [number, number]),
      snapshot.goldFirstMtime,
      snapshot.goldRollingRateValue,
      snapshot.goldSessionRateValue,
    );
    this.prevLiveTotalXp = snapshot.currentTotalXp;
    // Restored sessions always start on the save path; live ownership is runtime-only.
    this.xpLiveOwning = false;
    this.goldLiveOwning = false;
    this.lastLiveXpSec = null;
    this.lastLiveGoldSec = null;
  }
}
