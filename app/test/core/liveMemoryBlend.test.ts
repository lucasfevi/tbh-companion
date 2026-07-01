import { describe, it, expect } from "vitest";
import { pickPreferLive, blendStage } from "../../src/core/liveMemory/blend";
import { liveReaderState } from "../../src/core/liveMemory/status";
import type { LiveMemoryStatus } from "../../shared/types";

describe("pickPreferLive (per-stat blend — LMR-05)", () => {
  it("prefers the live value when present", () => {
    expect(pickPreferLive(123, 456)).toBe(123);
  });

  it("falls back to save when the live value is null/undefined", () => {
    expect(pickPreferLive(null, 456)).toBe(456);
    expect(pickPreferLive(undefined, 456)).toBe(456);
  });

  it("treats 0 as a real live value, not a fallback trigger", () => {
    expect(pickPreferLive(0, 5)).toBe(0);
  });
});

describe("blendStage", () => {
  it("prefers live stage key + wave when present", () => {
    expect(blendStage({ stageKey: 1234, stageWave: 5 }, { stageKey: 10, stageWave: 1 })).toEqual({
      stageKey: 1234,
      stageWave: 5,
    });
  });

  it("falls back to the save stage when live is null", () => {
    expect(blendStage(null, { stageKey: 10, stageWave: 1 })).toEqual({
      stageKey: 10,
      stageWave: 1,
    });
  });

  it("blends each field independently (live key, save wave)", () => {
    expect(blendStage({ stageKey: 1234, stageWave: null }, { stageKey: 10, stageWave: 7 })).toEqual(
      { stageKey: 1234, stageWave: 7 },
    );
  });
});

describe("liveReaderState", () => {
  const base: LiveMemoryStatus = {
    running: true,
    attached: true,
    pid: 100,
    gameVersion: "1.00.21",
    supported: true,
  };

  it("is off when the reader is disabled", () => {
    expect(liveReaderState(base, false)).toBe("off");
    expect(liveReaderState(null, false)).toBe("off");
  });

  it("is connecting when enabled but no status / not running / not attached", () => {
    expect(liveReaderState(null, true)).toBe("connecting");
    expect(liveReaderState({ ...base, running: false }, true)).toBe("connecting");
    expect(liveReaderState({ ...base, attached: false }, true)).toBe("connecting");
  });

  it("is degraded when attached to an unsupported version", () => {
    expect(liveReaderState({ ...base, supported: false }, true)).toBe("degraded");
  });

  it("is attached when attached to a supported version", () => {
    expect(liveReaderState(base, true)).toBe("attached");
  });
});
