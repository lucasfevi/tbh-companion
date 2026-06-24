/** Expected target-monster kills in one full stage clear. */
export function expectedKillsPerClear(monstersPerClear: number, spawnPercent: number): number {
  if (monstersPerClear <= 0 || spawnPercent <= 0) return 0;
  return (monstersPerClear * spawnPercent) / 100;
}

/** Full clears still needed at a given stage (pet unlock farm formula). */
export function runsToUnlock(remainingKills: number, expectedPerClear: number): number {
  if (remainingKills <= 0 || expectedPerClear <= 0) return 0;
  return Math.ceil(remainingKills / expectedPerClear);
}

export function formatRunsMessage(runsRemaining: number, unlocked: boolean): string {
  if (unlocked || runsRemaining <= 0) return "Unlocked";
  return `~${runsRemaining.toLocaleString("en-US")} more runs on this stage to unlock`;
}
