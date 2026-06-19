/** One auto-open-enabled chest type feeding the inventory. */
export interface ChestFillSource {
  /** Held (unopened) chests of this type, from the save's BoxData. */
  heldChests: number;
  /** Effective seconds to auto-open one chest (base minus rune reduction). */
  autoOpenSecondsPerChest: number;
  /** Measured chest drops per hour from Player.log (chests queued for auto-open). */
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
  /** Chests currently held (unopened) across enabled types. */
  heldChestItems: number;
  /** Long-run inventory items/hour once held backlogs are drained (min of drop vs open rate). */
  steadyItemsPerHour: number;
  /** Hours until full, or null when nothing will flow into the inventory. */
  hoursUntilFull: number | null;
}

interface FillSegment {
  held: number;
  openRate: number;
  drops: number;
  /** When held > 0 and openRate > drops, rate drops from openRate to drops at this hour. */
  depleteTime: number | null;
}

/** Inventory items/hour from one chest type at `elapsedHours` since t=0. */
function inventoryRateFromSource(segment: FillSegment, elapsedHours: number): number {
  const { held, openRate, drops } = segment;
  if (openRate === Infinity) return drops;
  if (openRate <= 0) return 0;
  if (drops >= openRate) return openRate;
  if (held <= 0) return drops;
  if (segment.depleteTime === null) return openRate;
  return elapsedHours < segment.depleteTime ? openRate : drops;
}

function steadyRateFromSource(segment: FillSegment): number {
  const { openRate, drops } = segment;
  if (openRate === Infinity) return drops;
  if (openRate <= 0) return 0;
  return Math.min(drops, openRate);
}

function buildSegments(sources: ChestFillSource[]): FillSegment[] {
  return sources.map((source) => {
    const held = Math.max(0, source.heldChests);
    const drops = Math.max(0, source.dropsPerHour);
    const seconds = Math.max(0, source.autoOpenSecondsPerChest);
    const openRate = seconds > 0 ? 3600 / seconds : Infinity;
    const depleteTime =
      openRate !== Infinity && openRate > drops && held > 0 ? held / (openRate - drops) : null;
    return { held, openRate, drops, depleteTime };
  });
}

/**
 * Estimates time until the inventory is full from auto-opened chests.
 *
 * Each enabled type is modeled as a serial auto-open queue: drops add chests,
 * the opener removes them at `3600 / autoOpenSecondsPerChest` chests/hour. Inventory
 * receives one slot per chest opened (same unit as Player.log drop counts). Opening
 * a chest can yield multiple gear pieces in-game, so this is a rough lower bound on
 * fill pressure from held stock.
 *
 * Act boss chests are excluded by the caller: Player.log doesn't report act boss
 * drops. Types with auto-open off don't appear in `sources`.
 */
export function predictFillTime(input: PredictFillTimeInput): PredictFillTimeResult {
  const capacity = input.inventoryCapacity;
  const slotsRemaining = Math.max(0, capacity - input.inventoryUsed);
  const sources = input.sources.filter(
    (source) => source.heldChests > 0 || source.dropsPerHour > 0,
  );

  const heldChestItems = sources.reduce((sum, source) => sum + Math.max(0, source.heldChests), 0);
  const segments = buildSegments(sources);
  const steadyItemsPerHour = segments.reduce(
    (sum, segment) => sum + steadyRateFromSource(segment),
    0,
  );

  const baseResult = { slotsRemaining, heldChestItems, steadyItemsPerHour };

  if (capacity <= 0) {
    return { ...baseResult, slotsRemaining: 0, hoursUntilFull: null };
  }

  if (slotsRemaining <= 0) {
    return { ...baseResult, slotsRemaining: 0, hoursUntilFull: 0 };
  }

  if (segments.length === 0) {
    return { ...baseResult, hoursUntilFull: null };
  }

  const instantItems = segments.reduce(
    (sum, segment) => sum + (segment.openRate === Infinity ? segment.held : 0),
    0,
  );
  if (instantItems >= slotsRemaining) {
    return { ...baseResult, hoursUntilFull: 0 };
  }

  const breakpoints = [
    ...new Set(
      segments
        .map((segment) => segment.depleteTime)
        .filter((time): time is number => time !== null && time > 0),
    ),
  ].sort((a, b) => a - b);

  let filled = instantItems;
  let prevT = 0;

  for (const breakpoint of [...breakpoints, Infinity]) {
    const slope = segments.reduce(
      (sum, segment) => sum + inventoryRateFromSource(segment, prevT),
      0,
    );

    if (slope > 0) {
      const needed = slotsRemaining - filled;
      const hoursInSegment = needed / slope;
      if (prevT + hoursInSegment <= breakpoint) {
        return { ...baseResult, hoursUntilFull: prevT + hoursInSegment };
      }
      filled += slope * (breakpoint - prevT);
    }

    if (breakpoint === Infinity) break;
    prevT = breakpoint;
  }

  return { ...baseResult, hoursUntilFull: null };
}
