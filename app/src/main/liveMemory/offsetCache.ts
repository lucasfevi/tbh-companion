// Per-version LiveOffsets disk cache — stored next to the game exe.
// JSON round-trips the full LiveOffsets shape; bigint fields are serialized as decimal strings.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { LiveOffsets } from "../../core/liveMemory/offsets";

// ── Serialization: bigint ↔ string ───────────────────────────────────────────

// Bigints are serialized as hex strings prefixed with "0x" so they are
// unambiguously distinguished from plain JSON numbers on round-trip.
function replacer(_k: string, v: unknown): unknown {
  return typeof v === "bigint" ? `0x${v.toString(16)}` : v;
}

function reviver(_k: string, v: unknown): unknown {
  if (typeof v === "string" && /^0x[0-9a-f]+$/i.test(v)) return BigInt(v);
  return v;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Path for the per-version cache file co-located with the game install dir. */
export function offsetCachePath(gameInstallDir: string, version: string): string {
  return join(gameInstallDir, `tbh-companion-offsets-v${version}.json`);
}

/**
 * Load cached offsets for `version` from `gameInstallDir`.
 * Returns null when the file is missing, corrupt, or version-mismatched.
 */
export function loadCachedOffsets(
  gameInstallDir: string,
  version: string,
): LiveOffsets | null {
  try {
    const path = offsetCachePath(gameInstallDir, version);
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw, reviver) as LiveOffsets;
    if (parsed?.gameVersion !== version) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Save `offsets` to `{gameInstallDir}/tbh-companion-offsets-v{version}.json`.
 * No-throw: silently swallows FS errors.
 */
export function saveCachedOffsets(gameInstallDir: string, offsets: LiveOffsets): void {
  try {
    const path = offsetCachePath(gameInstallDir, offsets.gameVersion);
    writeFileSync(path, JSON.stringify(offsets, replacer), "utf-8");
  } catch {
    // Cache write failure is non-fatal.
  }
}
