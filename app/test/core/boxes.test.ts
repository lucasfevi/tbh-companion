import { describe, it, expect } from "vitest";

import {
  resolveChestHoldings,
  buildChestState,
  commonBoxCapacity,
  stageBossBoxCapacity,
  actBossBoxCapacity,
  boxSlotState,
  loadBoxTypeCatalog,
  loadRuneBoxCapCatalog,
  loadRuneAutoOpenCatalog,
  runeAutoOpenReductionSeconds,
  effectiveAutoOpenSeconds,
  type RunePurchase,
} from "../../src/core/boxes";

import type { ChestHolding } from "../../shared/types";

const boxTypes = loadBoxTypeCatalog();

const runeCap = loadRuneBoxCapCatalog();

const autoOpen = loadRuneAutoOpenCatalog();

describe("resolveChestHoldings", () => {
  it("aggregates duplicate BoxTypes and labels from catalog", () => {
    const chests: ChestHolding[] = [
      { type: 0, quantity: 4 },

      { type: 1, quantity: 0 },

      { type: 2, quantity: 3 },
    ];

    const rows = resolveChestHoldings(chests, boxTypes);

    expect(rows).toHaveLength(2);

    expect(rows[0]).toMatchObject({ boxType: 0, category: "common", quantity: 4 });

    expect(rows[1]).toMatchObject({ boxType: 2, category: "act", quantity: 3 });
  });

  it("labels stage boss BoxType 1 as rare", () => {
    const rows = resolveChestHoldings([{ type: 1, quantity: 2 }], boxTypes);

    expect(rows[0]).toMatchObject({
      boxType: 1,

      label: "Stage boss (blue)",

      category: "rare",

      quantity: 2,
    });
  });

  it("falls back to Type N for unknown ids", () => {
    const rows = resolveChestHoldings([{ type: 42, quantity: 2 }], boxTypes);

    expect(rows[0].label).toBe("Type 42");

    expect(rows[0].category).toBe("unknown");
  });
});

describe("box capacity by category", () => {
  it("starts common at base 5 with no runes", () => {
    expect(commonBoxCapacity([], runeCap)).toBe(5);
  });

  it("starts stage boss and act boss at base 5 with no runes", () => {
    expect(stageBossBoxCapacity([], runeCap)).toBe(5);

    expect(actBossBoxCapacity([], runeCap)).toBe(5);
  });

  it("adds +1 per purchased containment node for common", () => {
    const purchases: RunePurchase[] = [
      { runeKey: 1031, level: 1 },

      { runeKey: 11002, level: 1 },

      { runeKey: 11, level: 3 },
    ];

    expect(commonBoxCapacity(purchases, runeCap)).toBe(7);
  });

  it("adds +1 per purchased vault node for stage boss", () => {
    const purchases: RunePurchase[] = [{ runeKey: 11003, level: 1 }];

    expect(stageBossBoxCapacity(purchases, runeCap)).toBe(6);
  });

  it("adds +1 per purchased infinity node for act boss", () => {
    const purchases: RunePurchase[] = [{ runeKey: 11004, level: 1 }];

    expect(actBossBoxCapacity(purchases, runeCap)).toBe(6);
  });
});

describe("boxSlotState", () => {
  it("marks full at capacity", () => {
    expect(boxSlotState(5, 5)).toMatchObject({ isFull: true, slotsRemaining: 0 });

    expect(boxSlotState(4, 5)).toMatchObject({ isFull: false, slotsRemaining: 1 });
  });
});

describe("auto-open reduction runes", () => {
  it("has zero reduction with no runes", () => {
    expect(runeAutoOpenReductionSeconds([], autoOpen.common)).toBe(0);
    expect(effectiveAutoOpenSeconds([], autoOpen.common)).toBe(autoOpen.common.baseSeconds);
  });

  it("sums seconds per level for matched common-chest rune nodes", () => {
    const purchases: RunePurchase[] = [
      { runeKey: 130021, level: 2 },
      { runeKey: 22, level: 5 },
    ];
    expect(runeAutoOpenReductionSeconds(purchases, autoOpen.common)).toBe(6);
    expect(effectiveAutoOpenSeconds(purchases, autoOpen.common)).toBe(
      autoOpen.common.baseSeconds - 6,
    );
  });

  it("clamps effective seconds at 0 when reduction exceeds base", () => {
    const purchases: RunePurchase[] = [{ runeKey: 19020011, level: 100 }];
    expect(effectiveAutoOpenSeconds(purchases, autoOpen.actBoss)).toBe(0);
  });

  it("matches stage boss rune nodes independently from common", () => {
    const purchases: RunePurchase[] = [{ runeKey: 150011, level: 1 }];
    expect(runeAutoOpenReductionSeconds(purchases, autoOpen.stageBoss)).toBe(5);
    expect(runeAutoOpenReductionSeconds(purchases, autoOpen.common)).toBe(0);
  });
});

describe("buildChestState", () => {
  it("builds full chest state from fixture holdings", () => {
    const chests: ChestHolding[] = [
      { type: 0, quantity: 4 },

      { type: 1, quantity: 1 },

      { type: 2, quantity: 0 },
    ];

    const purchases: RunePurchase[] = [
      { runeKey: 11002, level: 1 },

      { runeKey: 11003, level: 1 },
    ];

    const state = buildChestState(chests, purchases, 100, boxTypes, runeCap, autoOpen);

    expect(state.totalHeld).toBe(5);

    expect(state.common).toMatchObject({ quantity: 4, capacity: 6, isFull: false });

    expect(state.stageBoss).toMatchObject({ quantity: 1, capacity: 6, isFull: false });

    expect(state.actBoss).toMatchObject({ quantity: 0, capacity: 5, isFull: false });

    expect(state.capacity.common.runeBonus).toBe(1);

    expect(state.capacity.stageBoss.runeBonus).toBe(1);

    expect(state.capacity.common.runeLabel).toBe("Rune of Containment");

    expect(state.capacity.stageBoss.runeLabel).toBe("Rune of the Vault");

    // No auto-open reduction runes purchased here, so effective = base seconds.
    expect(state.autoOpen).toEqual({ common: 300, stageBoss: 600, actBoss: 60 });

    expect(state.saveMtime).toBe(100);
  });
});
