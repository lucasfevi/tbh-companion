/** One auto-open-enabled chest type feeding the inventory. */
export interface ChestFillSource {
  /** Held (unopened) chests of this type, from the save's BoxData. */
  heldChests: number;
  /** Effective seconds to auto-open one chest (base minus rune reduction). */
  autoOpenSecondsPerChest: number;
  /** Measured chest drops per hour from Player.log (chests ≈ inventory items). */
  dropsPerHour: number;
}

export interface PredictFillTimeInput {
  inventoryCapacity: number;
  inventoryUsed: number;
  /** One entry per chest type the player has auto-open enabled for. */
  sources: ChestFillSource[];
}

export interface PredictFillTimeResult {
  slotsRemaining: number;
  /** Items queued from held chests that will auto-open into the inventory. */
  heldChestItems: number;
  /** Steady-state items/hour from ongoing drops once held chests are drained. */
  steadyItemsPerHour: number;
  /** Hours until full, or null when nothing will flow into the inventory. */
  hoursUntilFull: number | null;
}

/**
 * Estimates time until the inventory is full from auto-opened chests.
 *
 * Each enabled chest type feeds the inventory two ways, counted in parallel:
 *  - Its **held** chests auto-open one at a time, so `heldChests` items arrive
 *    over `heldChests × autoOpenSecondsPerChest` (the drain phase).
 *  - Ongoing **drops** add `dropsPerHour` items the whole time.
 *
 * This is why a type with full chest slots (measured drops 0) still produces a
 * finite estimate once auto-open is on: the held stockpile drains in on its own.
 * One chest is treated as one inventory item, matching the drop-rate model.
 *
 * Act boss chests are excluded by the caller: Player.log doesn't report act boss
 * drops. Types with auto-open off don't appear in `sources` (they sit unopened).
 */
export function predictFillTime(input: PredictFillTimeInput): PredictFillTimeResult {
  const slotsRemaining = Math.max(0, input.inventoryCapacity - input.inventoryUsed);
  const sources = input.sources.filter((s) => s.heldChests > 0 || s.dropsPerHour > 0);

  const heldChestItems = sources.reduce((sum, s) => sum + Math.max(0, s.heldChests), 0);
  const steadyItemsPerHour = sources.reduce((sum, s) => sum + Math.max(0, s.dropsPerHour), 0);

  if (slotsRemaining <= 0) {
    return { slotsRemaining: 0, heldChestItems, steadyItemsPerHour, hoursUntilFull: 0 };
  }

  // Per-source drain of the held stockpile (openRate items/hour for drainTime
  // hours) plus continuous drops. Zero auto-open seconds means instant opening.
  const segments = sources.map((s) => {
    const held = Math.max(0, s.heldChests);
    const seconds = Math.max(0, s.autoOpenSecondsPerChest);
    const openRate = seconds > 0 ? 3600 / seconds : Infinity;
    const drainTime = openRate === Infinity ? 0 : held / openRate;
    return { held, openRate, drainTime, drops: Math.max(0, s.dropsPerHour) };
  });

  // Held chests that open instantly (no auto-open delay) land right away.
  let filled = segments.reduce((sum, seg) => sum + (seg.openRate === Infinity ? seg.held : 0), 0);
  if (filled >= slotsRemaining) {
    return { slotsRemaining, heldChestItems, steadyItemsPerHour, hoursUntilFull: 0 };
  }

  // Walk the piecewise-linear fill curve: each drain phase ending changes slope.
  const breakpoints = [...new Set(segments.map((s) => s.drainTime).filter((t) => t > 0))].sort(
    (a, b) => a - b,
  );

  let prevT = 0;
  for (const bp of [...breakpoints, Infinity]) {
    const slope = segments.reduce((sum, seg) => {
      const draining = seg.openRate !== Infinity && prevT < seg.drainTime;
      return sum + (draining ? seg.openRate : 0) + seg.drops;
    }, 0);

    if (slope > 0) {
      const needed = slotsRemaining - filled;
      const hoursInSeg = needed / slope;
      if (prevT + hoursInSeg <= bp) {
        return {
          slotsRemaining,
          heldChestItems,
          steadyItemsPerHour,
          hoursUntilFull: prevT + hoursInSeg,
        };
      }
      filled += slope * (bp - prevT);
    }
    if (bp === Infinity) break;
    prevT = bp;
  }

  return { slotsRemaining, heldChestItems, steadyItemsPerHour, hoursUntilFull: null };
}
