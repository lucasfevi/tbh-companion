// Pure derivation of the reader's user-facing state from its status + the
// enabled pref. Single source of truth for the toolbar indicator and the
// diagnostics tab. No node/electron/React imports.

import type { LiveMemoryStatus } from "../../../shared/types";

export type LiveReaderState = "off" | "connecting" | "attached" | "degraded";

/**
 * Map the reader status to a display state:
 * - `off`        — reader disabled (default)
 * - `connecting` — enabled, but the worker isn't up or hasn't attached to the game yet
 * - `degraded`   — attached, but no bundled offsets for the detected game version
 * - `attached`   — attached to a supported game version (live data flowing)
 */
export function liveReaderState(
  status: LiveMemoryStatus | null,
  enabled: boolean,
): LiveReaderState {
  if (!enabled) return "off";
  if (!status || !status.running || !status.attached) return "connecting";
  if (!status.supported) return "degraded";
  return "attached";
}
