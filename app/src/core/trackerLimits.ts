/** Max XP/hour we treat as physically possible for TBH (generous vs observed ~100M/hr peaks). */
export const MAX_PLAUSIBLE_XP_RATE = 5e10;

/** Hard cap on session XP total — anything above is memory/restore corruption. */
export const MAX_PLAUSIBLE_CUMULATIVE_XP = 1e10;

export function isPlausibleXpRate(rate: number): boolean {
  return Number.isFinite(rate) && rate >= 0 && rate < MAX_PLAUSIBLE_XP_RATE;
}

export function isPlausibleCumulativeXp(total: number, elapsedSec: number): boolean {
  if (!Number.isFinite(total) || total < 0) return false;
  if (total >= MAX_PLAUSIBLE_CUMULATIVE_XP) return false;
  if (total > 0 && elapsedSec > 0) {
    const impliedRate = (total / elapsedSec) * 3600;
    if (impliedRate >= MAX_PLAUSIBLE_XP_RATE) return false;
  }
  return true;
}
