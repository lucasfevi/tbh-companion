// Builds the Stats payload pushed to the renderer from tracker + last snapshot.

import type { LiveMemorySnapshot, Stats, SaveSnapshot } from "../../shared/types";

import type { ChestDropTracker } from "../core/chestDropTracker";
import type { XpTracker } from "../core/tracker";

import { heroName } from "../core/heroes";

const IDLE_THRESHOLD_SECONDS = 120;

const HISTORY_VISIBLE = 50;

function nowSeconds(): number {
  return Date.now() / 1000;
}

export function buildStats(
  tracker: XpTracker,
  chestDropTracker: ChestDropTracker,
  lastSnap: SaveSnapshot | null,
  lastError: string | null,
  statusOverride: string | null = null,
  liveFrame: LiveMemorySnapshot | null = null,
): Stats {
  const liveXp = liveFrame?.connected === true && tracker.xpLiveActive();
  const liveHeroes = liveXp && liveFrame?.heroes && liveFrame.heroes.length > 0;

  const heroes = liveHeroes
    ? liveFrame!.heroes!.map((h) => ({
        key: String(h.heroKey),
        name: heroName(String(h.heroKey)),
        level: h.level,
        rate: tracker.heroRate(String(h.heroKey)),
      }))
    : (lastSnap?.heroes ?? tracker.heroes)
        .filter((h) => h.unlocked || h.exp > 0)
        .map((h) => ({
          key: h.key,
          name: heroName(h.key),
          level: h.level,
          rate: tracker.heroRate(h.key),
        }));

  const sinceGain = tracker.secondsSinceGain;

  // Age of the save file content (game write time), not our poll clock.
  const sinceRead = lastSnap ? nowSeconds() - lastSnap.saveMtime : null;

  let status: string;

  if (statusOverride) {
    status = statusOverride;
  } else if (lastError) {
    status = lastError;
  } else if (sinceGain === null) {
    status = "Tracking";
  } else if (sinceGain > IDLE_THRESHOLD_SECONDS) {
    status = `No XP gained for ${Math.round(sinceGain)}s - is the game running?`;
  } else {
    status = "Tracking";
  }

  const stageKey =
    liveFrame?.connected && liveFrame.stageKey != null
      ? liveFrame.stageKey
      : (lastSnap?.stageKey ?? 0);
  const stageWave =
    liveFrame?.connected && liveFrame.stageWave != null
      ? liveFrame.stageWave
      : (lastSnap?.stageWave ?? 0);

  return {
    connected: lastError === null,

    status,

    rollingRate: tracker.rollingRate,

    sessionRate: tracker.sessionRate,

    goldRate: tracker.goldRollingRate,

    cumulativeGained: tracker.cumulativeGained,

    goldGained: tracker.goldGained,

    elapsed: tracker.elapsed,

    secondsSinceGain: sinceGain,

    secondsSinceRead: sinceRead,

    stageKey,

    stageWave,

    heroes,

    history: tracker.history.slice(-HISTORY_VISIBLE).reverse(),
    chestDrops: chestDropTracker.getStats(tracker.elapsed),
  };
}
