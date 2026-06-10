// Builds the Stats payload pushed to the renderer from tracker + last snapshot.



import type { Stats, SaveSnapshot } from "../../shared/types";

import type { XpTracker } from "../core/tracker";

import { heroName } from "../core/heroes";



const IDLE_THRESHOLD_SECONDS = 120;

const HISTORY_VISIBLE = 50;



function nowSeconds(): number {

  return Date.now() / 1000;

}



export function buildStats(

  tracker: XpTracker,

  lastSnap: SaveSnapshot | null,

  lastError: string | null,

): Stats {

  const sourceHeroes = lastSnap?.heroes ?? tracker.heroes;

  const heroes = sourceHeroes

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

  if (lastError) {

    status = lastError;

  } else if (sinceGain === null) {

    status = "Tracking";

  } else if (sinceGain > IDLE_THRESHOLD_SECONDS) {

    status = `No XP gained for ${Math.round(sinceGain)}s - is the game running?`;

  } else {

    status = "Tracking";

  }



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

    stageKey: lastSnap?.stageKey ?? 0,

    stageWave: lastSnap?.stageWave ?? 0,

    heroes,

    history: tracker.history.slice(-HISTORY_VISIBLE).reverse(),

  };

}


