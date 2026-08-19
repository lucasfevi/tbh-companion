import { describe, it, expect } from "vitest";
import { XpTracker } from "../../src/core/tracker";
import type { SaveSnapshot } from "../../shared/types";

function snap(mtime: number, heroExp: number, gold = 0): SaveSnapshot {
  return {
    heroes: [{ key: "101", level: 1, exp: heroExp, unlocked: true }],
    totalHeroExp: heroExp,
    playTime: 0,
    saveMtime: mtime,
    stageKey: 3205,
    stageWave: 1,
    maxStage: 0,
    gold,
  };
}

describe("XpTracker", () => {
  it("returns 0 and sets no rate on the first (init) update", () => {
    const t = new XpTracker(300);
    expect(t.update(snap(1000, 500))).toBe(0);
    expect(t.rollingRate).toBe(0);
    expect(t.cumulativeGained).toBe(0);
  });

  it("computes XP/hour from the mtime span, not poll time", () => {
    const t = new XpTracker(300);
    t.update(snap(1000, 0));
    const gain = t.update(snap(1060, 600)); // +600 over 60s -> 36000/hr
    expect(gain).toBe(600);
    expect(t.cumulativeGained).toBe(600);
    expect(t.rollingRate).toBeCloseTo(36000, 5);
    expect(t.heroRate("101")).toBeCloseTo(36000, 5);
  });

  it("holds the rate constant when XP does not change", () => {
    const t = new XpTracker(300);
    t.update(snap(1000, 0));
    t.update(snap(1060, 600));
    const before = t.rollingRate;
    const gain = t.update(snap(1120, 600)); // no XP change
    expect(gain).toBe(0);
    expect(t.rollingRate).toBe(before);
  });

  it("treats an XP drop (level-up reset) as a gain of the new value", () => {
    const t = new XpTracker(300);
    t.update(snap(1000, 0));
    t.update(snap(1060, 600));
    const gain = t.update(snap(1120, 50)); // dropped 600 -> 50: counts 50
    expect(gain).toBe(50);
    expect(t.cumulativeGained).toBe(650);
  });

  it("records history entries only on XP change", () => {
    const t = new XpTracker(300);
    t.update(snap(1000, 0));
    t.update(snap(1060, 600));
    t.update(snap(1120, 600)); // no change -> no history
    t.update(snap(1180, 900)); // +300
    expect(t.history).toHaveLength(2);
    expect(t.history[0].delta).toBe(600);
    expect(t.history[1].delta).toBe(300);
    expect(t.history[1].stageKey).toBe(3205);
  });

  it("counts gold earned only, ignoring spending", () => {
    const t = new XpTracker(300);
    t.update(snap(1000, 0, 1000));
    t.update(snap(1060, 0, 1500)); // +500 earned
    t.update(snap(1120, 0, 1200)); // spent 300 -> ignored
    t.update(snap(1180, 0, 1700)); // +500 earned
    expect(t.goldGained).toBe(1000);
    expect(t.goldRollingRate).toBeGreaterThan(0);
  });

  it("reset clears session state", () => {
    const t = new XpTracker(300);
    t.update(snap(1000, 0));
    t.update(snap(1060, 600));
    t.reset();
    expect(t.cumulativeGained).toBe(0);
    expect(t.rollingRate).toBe(0);
    expect(t.history).toHaveLength(0);
    expect(t.update(snap(2000, 999))).toBe(0); // re-inits
  });

  it("round-trips captureSnapshot and applySnapshot", () => {
    const t = new XpTracker(300);
    t.update(snap(1000, 0));
    t.update(snap(1060, 600));
    const copy = new XpTracker(300);
    copy.applySnapshot(t.captureSnapshot());
    expect(copy.cumulativeGained).toBe(600);
    expect(copy.rollingRate).toBeCloseTo(t.rollingRate, 5);
    expect(copy.history).toHaveLength(1);
    const gain = copy.update(snap(1120, 900));
    expect(gain).toBe(300);
    expect(copy.cumulativeGained).toBe(900);
  });

  it("secondsSinceGain uses save mtime and ignores reads without XP change", () => {
    const t = new XpTracker(300);
    t.update(snap(1000, 0));
    expect(t.secondsSinceGain).toBeNull();

    const baseNow = Date.now() / 1000;
    t.update(snap(baseNow - 30, 600)); // XP gain at mtime 30s ago
    expect(t.secondsSinceGain).toBeCloseTo(30, 0);

    t.update(snap(baseNow - 5, 600)); // save wrote 5s ago, XP unchanged
    expect(t.secondsSinceGain).toBeCloseTo(30, 0); // still anchored to last gain mtime
  });
});

describe("XpTracker.updateLive", () => {
  it("is ignored before the first save update (not yet initialized)", () => {
    const t = new XpTracker(300);
    t.updateLive({ gold: 5000, heroes: [{ heroKey: 101, level: 1, exp: 200 }] }, 1000);
    expect(t.currentGold).toBe(0);
    expect(t.currentTotalXp).toBe(0);
    expect(t.goldRollingRate).toBe(0);
  });

  it("updates gold rate from live wall-time samples", () => {
    const t = new XpTracker(300);
    t.update(snap(1000, 0, 0)); // init
    t.updateLive({ gold: 3600, heroes: null }, 1000); // +3600 gold at t=1000
    t.updateLive({ gold: 7200, heroes: null }, 1001); // +3600 gold at t=1001 (+1s)
    // 3600 gold/s = 3_600 * 3600 hr = 12_960_000/hr  (only positive deltas count from first change)
    expect(t.goldRollingRate).toBeGreaterThan(0);
    expect(t.currentGold).toBe(7200);
  });

  it("accumulates XP gain and updates rates from live samples", () => {
    const t = new XpTracker(300);
    t.update(snap(1000, 0)); // init: hero 101 @ exp 0
    // First live tick establishes the live baseline (no gain counted); the
    // second tick's +600 is the real live delta.
    t.updateLive({ gold: null, heroes: [{ heroKey: 101, level: 1, exp: 600 }] }, 1000);
    t.updateLive({ gold: null, heroes: [{ heroKey: 101, level: 1, exp: 1200 }] }, 1060);
    expect(t.cumulativeGained).toBe(600);
    expect(t.currentTotalXp).toBe(1200);
  });

  it("does NOT count the save→live baseline jump as XP gain", () => {
    const t = new XpTracker(300);
    t.update(snap(1000, 1000)); // save baseline: hero 101 @ exp 1000
    // Live reports a very different value for the same hero (different quantity /
    // fresher scale). The takeover must re-baseline, not count ~999k as gained.
    t.updateLive({ gold: null, heroes: [{ heroKey: 101, level: 1, exp: 999_999 }] }, 1000);
    expect(t.cumulativeGained).toBe(0);
    expect(t.currentTotalXp).toBe(999_999);
  });

  it("ignores save-layer XP while the live path is driving", () => {
    const t = new XpTracker(300);
    const now = Date.now() / 1000;
    t.update(snap(now - 100, 1000)); // init from save
    // Live takes over and accrues a real +100.
    t.updateLive({ gold: null, heroes: [{ heroKey: 101, level: 1, exp: 5000 }] }, now);
    t.updateLive({ gold: null, heroes: [{ heroKey: 101, level: 1, exp: 5100 }] }, now + 1);
    const gained = t.cumulativeGained;
    expect(gained).toBe(100);
    // A save write arrives with its stale, differently-scaled exp — must NOT
    // inject a spurious gain while live is still driving.
    const g = t.update(snap(now + 2, 1000));
    expect(g).toBe(0);
    expect(t.cumulativeGained).toBe(gained);
  });

  it("re-baselines cleanly when the save path reclaims XP after live goes stale", () => {
    const t = new XpTracker(300);
    const now = Date.now() / 1000;
    t.update(snap(now - 100, 1000)); // init
    // A stale live frame from long ago (>LIVE_TAKEOVER_SEC before the save write).
    t.updateLive({ gold: null, heroes: [{ heroKey: 101, level: 1, exp: 5000 }] }, now - 100);
    // Save reclaims XP: handover re-baselines to the save value, counts nothing.
    expect(t.update(snap(now, 1000))).toBe(0);
    expect(t.cumulativeGained).toBe(0);
    // Subsequent save deltas count normally again.
    expect(t.update(snap(now + 60, 1600))).toBe(600);
    expect(t.cumulativeGained).toBe(600);
  });

  it("seeded XP gain via live ticks drives the rolling rate", () => {
    const t = new XpTracker(300);
    t.update(snap(1000, 0)); // init
    t.updateLive({ gold: null, heroes: [{ heroKey: 101, level: 1, exp: 3600 }] }, 1000);
    t.updateLive({ gold: null, heroes: [{ heroKey: 101, level: 1, exp: 7200 }] }, 1001);
    // +7200 exp total, +3600 in 1s window → rate should be > 0
    expect(t.rollingRate).toBeGreaterThan(0);
  });

  it("updates currentGold with live value", () => {
    const t = new XpTracker(300);
    t.update(snap(1000, 0, 100));
    t.updateLive({ gold: 9999, heroes: null }, 1005);
    expect(t.currentGold).toBe(9999);
  });

  it("uses party total XP delta for session gain when heroes join", () => {
    const t = new XpTracker(300);
    t.update(snap(1000, 0));
    t.updateLive({ gold: null, heroes: [{ heroKey: 101, level: 1, exp: 100 }] }, 1000);
    t.updateLive(
      {
        gold: null,
        heroes: [
          { heroKey: 101, level: 1, exp: 200 },
          { heroKey: 201, level: 1, exp: 300 },
        ],
      },
      1001,
    );
    expect(t.cumulativeGained).toBe(400);
  });

  it("refreshes rolling rate on every live tick even without new XP gain", () => {
    const t = new XpTracker(300);
    t.update(snap(1000, 0));
    t.updateLive({ gold: null, heroes: [{ heroKey: 101, level: 1, exp: 100 }] }, 1000);
    t.updateLive({ gold: null, heroes: [{ heroKey: 101, level: 1, exp: 1100 }] }, 1001);
    const rateAfterGain = t.rollingRate;
    t.updateLive({ gold: null, heroes: [{ heroKey: 101, level: 1, exp: 1100 }] }, 1002);
    expect(rateAfterGain).toBeGreaterThan(0);
    expect(t.rollingRate).toBeLessThan(rateAfterGain);
  });

  it("records history entries on live XP gain", () => {
    const t = new XpTracker(300);
    t.update(snap(1000, 0));
    t.updateLive({ gold: null, heroes: [{ heroKey: 101, level: 1, exp: 600 }] }, 1000, {
      stageKey: 3205,
      stageWave: 2,
    });
    t.updateLive({ gold: null, heroes: [{ heroKey: 101, level: 1, exp: 1200 }] }, 1060, {
      stageKey: 3205,
      stageWave: 2,
    });
    expect(t.history).toHaveLength(1);
    expect(t.history[0].delta).toBe(600);
    expect(t.history[0].stageKey).toBe(3205);
    expect(t.history[0].stageWave).toBe(2);
  });

  it("applySnapshot clears live ownership flags", () => {
    const t = new XpTracker(300);
    const now = Date.now() / 1000;
    t.update(snap(now - 100, 1000));
    t.updateLive({ gold: null, heroes: [{ heroKey: 101, level: 1, exp: 5000 }] }, now);
    t.updateLive({ gold: null, heroes: [{ heroKey: 101, level: 1, exp: 5100 }] }, now + 1);
    expect(t.cumulativeGained).toBe(100);
    expect(t.update(snap(now + 2, 1000))).toBe(0);

    const copy = new XpTracker(300);
    copy.applySnapshot(t.captureSnapshot());
    expect(copy.update(snap(now + 10, 5600))).toBe(500);
  });
});
