import { describe, it, expect } from "vitest";
import {
  aggregateSubKeyToItemKey,
  materialStacksFromAggregates,
  parseAggregateEntries,
} from "../../src/core/inventory/aggregates";

describe("parseAggregateEntries", () => {
  it("reads Type/SubKey/Value rows from player save", () => {
    const entries = parseAggregateEntries({
      aggregateSaveDatas: [
        { Type: 0, SubKey: 10002, Value: 500 },
        { Type: 15, SubKey: 0, Value: 8608 },
        { Type: 0, SubKey: 0, Value: 99 },
      ],
    });
    expect(entries).toEqual([{ type: 0, subKey: 10002, value: 500 }]);
  });
});

describe("aggregateSubKeyToItemKey", () => {
  it("maps direct ItemKey SubKeys", () => {
    expect(aggregateSubKeyToItemKey(0, 141002)).toBe(141002);
  });

  it("maps suffix pattern 10002 -> 140002", () => {
    expect(aggregateSubKeyToItemKey(0, 10002)).toBe(140002);
  });
});

describe("materialStacksFromAggregates", () => {
  const isMaterial = (key: number) => key === 140002 || key === 141002;

  it("keeps only material ItemKeys with stack quantities", () => {
    const stacks = materialStacksFromAggregates(
      [
        { type: 0, subKey: 10002, value: 500 },
        { type: 0, subKey: 99999, value: 1 },
      ],
      isMaterial,
    );
    expect(stacks.get(140002)).toBe(500);
    expect(stacks.has(99999)).toBe(false);
  });
});
