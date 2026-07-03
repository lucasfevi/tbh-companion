import { useEffect, useState } from "react";
import type { StageRunStats } from "../../../shared/types";
import { reportIpcError } from "./reportError";

/**
 * Standalone stage-run history subscription. Intentionally NOT part of TbhProvider:
 * only the Live tab's stage-clear panel should re-render on STAGE_RUNS pushes —
 * not the whole app (same isolation rationale as useLiveMemory).
 */
export function useStageRuns(): StageRunStats | null {
  const [stats, setStats] = useState<StageRunStats | null>(null);

  useEffect(() => {
    let mounted = true;

    void window.tbh
      .getStageRuns()
      .then((s) => {
        if (mounted && s) setStats(s);
      })
      .catch(reportIpcError);

    const off = window.tbh.onStageRuns((s) => setStats(s));
    return () => {
      mounted = false;
      off();
    };
  }, []);

  return stats;
}
