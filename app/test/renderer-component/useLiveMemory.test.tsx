import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { LiveMemorySnapshot, LiveMemoryStatus } from "../../shared/types";

function snapshot(stageKey: number): LiveMemorySnapshot {
  return {
    connected: true,
    stageKey,
    stageWave: 3,
    source: "memory v1.00.21",
    readMs: 1,
    at: Date.now(),
  };
}

function status(overrides: Partial<LiveMemoryStatus> = {}): LiveMemoryStatus {
  return {
    running: true,
    attached: true,
    pid: 100,
    gameVersion: "1.00.21",
    supported: true,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetModules();
});

describe("useLiveMemory", () => {
  it("exposes the initial snapshot and pushed status", async () => {
    let pushStatus: ((s: LiveMemoryStatus) => void) | undefined;
    window.tbh = {
      getLiveMemory: vi.fn().mockResolvedValue(snapshot(1200)),
      onLiveMemory: vi.fn().mockReturnValue(() => {}),
      onLiveMemoryStatus: vi.fn().mockImplementation((cb) => {
        pushStatus = cb;
        return () => {};
      }),
    } as unknown as typeof window.tbh;

    const { useLiveMemory } = await import("../../src/renderer/lib/useLiveMemory");
    const { result } = renderHook(() => useLiveMemory());

    await waitFor(() => expect(result.current.snapshot?.stageKey).toBe(1200));

    act(() => pushStatus?.(status()));
    await waitFor(() => expect(result.current.status?.attached).toBe(true));
  });

  it("updates the snapshot from pushed frames", async () => {
    let pushSnap: ((s: LiveMemorySnapshot) => void) | undefined;
    window.tbh = {
      getLiveMemory: vi.fn().mockResolvedValue(null),
      onLiveMemory: vi.fn().mockImplementation((cb) => {
        pushSnap = cb;
        return () => {};
      }),
      onLiveMemoryStatus: vi.fn().mockReturnValue(() => {}),
    } as unknown as typeof window.tbh;

    const { useLiveMemory } = await import("../../src/renderer/lib/useLiveMemory");
    const { result } = renderHook(() => useLiveMemory());

    act(() => pushSnap?.(snapshot(2500)));
    await waitFor(() => expect(result.current.snapshot?.stageKey).toBe(2500));
  });

  it("clears the snapshot when the reader stops (running:false) so stats revert to save", async () => {
    let pushSnap: ((s: LiveMemorySnapshot) => void) | undefined;
    let pushStatus: ((s: LiveMemoryStatus) => void) | undefined;
    window.tbh = {
      getLiveMemory: vi.fn().mockResolvedValue(null),
      onLiveMemory: vi.fn().mockImplementation((cb) => {
        pushSnap = cb;
        return () => {};
      }),
      onLiveMemoryStatus: vi.fn().mockImplementation((cb) => {
        pushStatus = cb;
        return () => {};
      }),
    } as unknown as typeof window.tbh;

    const { useLiveMemory } = await import("../../src/renderer/lib/useLiveMemory");
    const { result } = renderHook(() => useLiveMemory());

    act(() => pushSnap?.(snapshot(999)));
    await waitFor(() => expect(result.current.snapshot?.stageKey).toBe(999));

    act(() => pushStatus?.(status({ running: false, attached: false, supported: false })));
    await waitFor(() => expect(result.current.snapshot).toBeNull());
  });

  it("unsubscribes on unmount", async () => {
    const offSnap = vi.fn();
    const offStatus = vi.fn();
    window.tbh = {
      getLiveMemory: vi.fn().mockResolvedValue(null),
      onLiveMemory: vi.fn().mockReturnValue(offSnap),
      onLiveMemoryStatus: vi.fn().mockReturnValue(offStatus),
    } as unknown as typeof window.tbh;

    const { useLiveMemory } = await import("../../src/renderer/lib/useLiveMemory");
    const { unmount } = renderHook(() => useLiveMemory());
    unmount();

    expect(offSnap).toHaveBeenCalledTimes(1);
    expect(offStatus).toHaveBeenCalledTimes(1);
  });
});
