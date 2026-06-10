import { useEffect, useState } from "react";
import type { BoxTimerState } from "../../../shared/types";
import { reportIpcError } from "./reportError";

export function useBoxTimers(): BoxTimerState | null {
  const [state, setState] = useState<BoxTimerState | null>(null);

  useEffect(() => {
    let mounted = true;

    void window.tbh
      .getBoxTimers()
      .then((s) => {
        if (mounted) setState(s);
      })
      .catch(reportIpcError);

    const off = window.tbh.onBoxTimers((s) => setState(s));
    return () => {
      mounted = false;
      off();
    };
  }, []);

  return state;
}

function fmtTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export { fmtTimer };
