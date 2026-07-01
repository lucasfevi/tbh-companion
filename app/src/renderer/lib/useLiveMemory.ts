import { useEffect, useState } from "react";
import type { LiveMemorySnapshot, LiveMemoryStatus } from "../../../shared/types";

/**
 * Standalone live-memory subscription. Intentionally NOT part of TbhProvider:
 * snapshots arrive at the poll rate and only the components that read live data
 * should re-render — never the whole app.
 *
 * When the reader stops (a `running: false` status), the snapshot is cleared so
 * every stat reverts to its save-file source (per-stat live/save blend).
 */
export function useLiveMemory(): {
  snapshot: LiveMemorySnapshot | null;
  status: LiveMemoryStatus | null;
} {
  const [snapshot, setSnapshot] = useState<LiveMemorySnapshot | null>(null);
  const [status, setStatus] = useState<LiveMemoryStatus | null>(null);

  useEffect(() => {
    let active = true;
    window.tbh
      .getLiveMemory?.()
      .then((s) => {
        if (active && s) setSnapshot(s);
      })
      .catch(() => {});
    const offSnap = window.tbh.onLiveMemory?.((s) => setSnapshot(s));
    const offStatus = window.tbh.onLiveMemoryStatus?.((s) => {
      setStatus(s);
      if (!s.running) setSnapshot(null);
    });
    return () => {
      active = false;
      offSnap?.();
      offStatus?.();
    };
  }, []);

  return { snapshot, status };
}
