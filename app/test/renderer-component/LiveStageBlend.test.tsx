import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { LiveMemorySnapshot } from "../../shared/types";

// Live memory snapshot is mutated per test via this hoisted ref.
const state = vi.hoisted(() => ({ live: null as LiveMemorySnapshot | null }));

const baseStats = {
  rollingRate: 0,
  goldRate: 0,
  sessionRate: 0,
  cumulativeGained: 0,
  goldGained: 0,
  elapsed: 0,
  stageKey: 1010,
  stageWave: 1,
  secondsSinceGain: 10,
  status: "Tracking",
  chestDrops: {
    commonTotal: 0,
    rareTotal: 0,
    commonPerHour: 0,
    rarePerHour: 0,
    readerRequired: true,
    breakdown: [],
    history: [],
  },
  heroes: [],
  history: [],
};

vi.mock("../../src/renderer/lib/useStats", () => ({ useStats: () => baseStats }));
vi.mock("../../src/renderer/lib/useInventory", () => ({ useInventory: () => null }));
vi.mock("../../src/renderer/lib/useChests", () => ({ useChests: () => null }));
vi.mock("../../src/renderer/lib/useLiveMemory", () => ({
  useLiveMemory: () => ({ snapshot: state.live, status: null }),
}));
// Echo stageName so we can assert exactly which stage key/wave was rendered.
vi.mock("../../src/core/stages", () => ({
  stageName: (key: number, wave?: number | null) => `MAP:${key}:${wave ?? ""}`,
}));

function liveSnapshot(stageKey: number, stageWave: number): LiveMemorySnapshot {
  return {
    connected: true,
    stageKey,
    stageWave,
    source: "memory v1.00.21",
    readMs: 1,
    at: Date.now(),
  };
}

beforeEach(() => {
  state.live = null;
  window.tbh = {} as typeof window.tbh;
});

describe("Live.tsx stage blend", () => {
  it("shows the save stage when no live snapshot is present (reader off)", async () => {
    const { Live } = await import("../../src/renderer/tabs/Live");
    render(<Live />);
    expect(screen.getByText("MAP:1010:1")).toBeInTheDocument();
  });

  it("prefers the live stage over the save stage when a snapshot is present", async () => {
    state.live = liveSnapshot(3020, 5);
    const { Live } = await import("../../src/renderer/tabs/Live");
    render(<Live />);
    expect(screen.getByText("MAP:3020:5")).toBeInTheDocument();
    expect(screen.queryByText("MAP:1010:1")).not.toBeInTheDocument();
  });
});
