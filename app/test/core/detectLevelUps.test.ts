import { describe, it, expect } from "vitest";
import { detectHeroLevelUps } from "../../src/core/heroes/detectLevelUps";
import type { HeroSnapshot } from "../../shared/types";

const hero = (key: string, level: number, exp = 0): HeroSnapshot => ({
  key,
  level,
  exp,
  unlocked: true,
});

describe("detectHeroLevelUps", () => {
  it("returns empty when prev is empty (first snapshot)", () => {
    expect(detectHeroLevelUps([], [hero("101", 5)])).toEqual([]);
  });

  it("detects a single level increase", () => {
    const prev = [hero("101", 5, 900)];
    const next = [hero("101", 6, 50)];
    expect(detectHeroLevelUps(prev, next)).toEqual([{ key: "101", previousLevel: 5, newLevel: 6 }]);
  });

  it("detects multiple heroes leveling up", () => {
    const prev = [hero("101", 5), hero("201", 2)];
    const next = [hero("101", 6), hero("201", 3)];
    expect(detectHeroLevelUps(prev, next)).toEqual([
      { key: "101", previousLevel: 5, newLevel: 6 },
      { key: "201", previousLevel: 2, newLevel: 3 },
    ]);
  });

  it("ignores new heroes not in prev snapshot", () => {
    const prev = [hero("101", 5)];
    const next = [hero("101", 5), hero("301", 1)];
    expect(detectHeroLevelUps(prev, next)).toEqual([]);
  });

  it("ignores level decreases", () => {
    const prev = [hero("101", 6)];
    const next = [hero("101", 5)];
    expect(detectHeroLevelUps(prev, next)).toEqual([]);
  });

  it("ignores unchanged levels", () => {
    const prev = [hero("101", 5)];
    const next = [hero("101", 5, 999)];
    expect(detectHeroLevelUps(prev, next)).toEqual([]);
  });
});
