// Runtime IL2CPP reads — live stage (StageCache chain). Pure: operates over an
// injected MemoryReader so it is unit-testable over synthetic memory maps.
//
// The save-layer stage fields lag the game; this path updates every tick.
// Gold (currency Dictionary<int,T> → ObscuredLong) is Phase 2; the dict int-key
// trap it depends on is captured in the locked schema (offsets.dict.entryKey).

import { readI32, readPtr, type MemoryReader } from "./memory";
import { plausibleStage, plausibleWave, type LiveOffsets } from "./offsets";
import { readStaticFieldPtr } from "./statics";

export interface RuntimeStage {
  stageKey: number | null;
  wave: number | null;
}

/**
 * Live stage key from `StageCacheManager → StageCache → StageInfoData.StageKey`,
 * plus the wave counter from the `StageManager` singleton when set.
 * Returns null when the cache chain can't be walked (fall back to the save value).
 */
export function readRuntimeStage(
  reader: MemoryReader,
  gaBase: bigint,
  gaSize: number,
  o: LiveOffsets,
): RuntimeStage | null {
  const candidates = o.il2cppClass.staticFieldsOffsets;

  const stageCachePtr = readStaticFieldPtr(
    reader,
    gaBase,
    gaSize,
    o.typeInfoRva.stageCacheManager,
    o.runtime.stage.currentCache,
    candidates,
  );
  if (stageCachePtr == null) return null;

  const stageInfoPtr = readPtr(reader, stageCachePtr + BigInt(o.runtime.stage.cacheInfoData));
  if (stageInfoPtr == null) return null;

  const stageKey = readI32(reader, stageInfoPtr + BigInt(o.runtime.stage.stageKey));

  // StageManager singleton runtime wave counter, when positive.
  let wave: number | null = null;
  const smSingleton = readStaticFieldPtr(
    reader,
    gaBase,
    gaSize,
    o.typeInfoRva.stageManager,
    0,
    candidates,
  );
  if (smSingleton != null) {
    const runtimeWave = readI32(reader, smSingleton + BigInt(o.runtime.stage.runtimeWave));
    if (plausibleWave(runtimeWave)) wave = runtimeWave;
  }

  return {
    stageKey: plausibleStage(stageKey) ? stageKey : null,
    wave,
  };
}
