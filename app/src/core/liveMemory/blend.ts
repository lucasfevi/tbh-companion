// Per-stat blend: live preferred, save fallback (LMR-05 / STATE.md [D17]).
// Pure — the one place the "prefer live when available, else save" rule lives.

/** Prefer the live value when present (non-nullish), else fall back to the save value. */
export function pickPreferLive<T>(live: T | null | undefined, save: T): T {
  return live ?? save;
}

export interface StagePair {
  stageKey: number | null;
  stageWave: number | null;
}

/** Blend stage key + wave independently, each preferring its live value. */
export function blendStage(live: StagePair | null | undefined, save: StagePair): StagePair {
  return {
    stageKey: pickPreferLive(live?.stageKey, save.stageKey),
    stageWave: pickPreferLive(live?.stageWave, save.stageWave),
  };
}
