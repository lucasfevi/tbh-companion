import { useEffect, useState } from "react";
import type { StageRunStats } from "../../../shared/types";
import { reportIpcError } from "./reportError";

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
