import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { LiveMemorySnapshot, LiveMemoryStatus } from "../../shared/types";
import { getVisibleTabs } from "../../src/renderer/components/appTabs";

const state = vi.hoisted(() => ({
  snapshot: null as LiveMemorySnapshot | null,
  status: null as LiveMemoryStatus | null,
}));

vi.mock("../../src/renderer/lib/useLiveMemory", () => ({
  useLiveMemory: () => ({ snapshot: state.snapshot, status: state.status }),
}));

vi.mock("../../src/renderer/lib/useStats", () => ({
  useStats: () => ({
    rollingRate: 12_000,
    goldRate: 5000,
    sessionRate: 10_000,
    cumulativeGained: 50_000,
    goldGained: 0,
    elapsed: 3600,
    stageKey: 1200,
    stageWave: 3,
    secondsSinceGain: 1,
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
  }),
}));

describe("dev-only diagnostics tab gating", () => {
  it("hides the debug tab in production builds", () => {
    expect(getVisibleTabs(false).map((t) => t.id)).not.toContain("debug");
  });

  it("shows the debug tab only in dev builds", () => {
    expect(getVisibleTabs(true).map((t) => t.id)).toContain("debug");
  });
});

describe("LiveMemoryDiagnostics", () => {
  it("renders attach state, version, and last read from the live snapshot", async () => {
    state.status = {
      running: true,
      attached: true,
      pid: 4242,
      gameVersion: "1.00.21",
      supported: true,
    };
    state.snapshot = {
      connected: true,
      stageKey: 1200,
      stageWave: 3,
      source: "memory v1.00.21",
      readMs: 2,
      at: Date.now(),
    };

    const { LiveMemoryDiagnostics } = await import("../../src/renderer/tabs/LiveMemoryDiagnostics");
    render(<LiveMemoryDiagnostics />);

    expect(screen.getByText("attached")).toBeInTheDocument();
    expect(screen.getByText("1.00.21")).toBeInTheDocument();
    expect(screen.getByText("4242")).toBeInTheDocument();
    expect(screen.getByText("1200")).toBeInTheDocument();
    expect(screen.getByText("memory v1.00.21")).toBeInTheDocument();
  });
});
