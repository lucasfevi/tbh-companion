import type { HeroSnapshot } from "../../../shared/types";

export interface HeroLevelUpEvent {
  key: string;
  previousLevel: number;
  newLevel: number;
}

/** Detect heroes whose level increased between two save snapshots. */
export function detectHeroLevelUps(prev: HeroSnapshot[], next: HeroSnapshot[]): HeroLevelUpEvent[] {
  if (prev.length === 0) return [];

  const prevByKey = new Map(prev.map((h) => [h.key, h.level]));
  const events: HeroLevelUpEvent[] = [];

  for (const hero of next) {
    const previousLevel = prevByKey.get(hero.key);
    if (previousLevel === undefined) continue;
    if (hero.level > previousLevel) {
      events.push({ key: hero.key, previousLevel, newLevel: hero.level });
    }
  }

  return events;
}
