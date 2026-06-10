import { useEffect, useState } from "react";
import type { ChestState } from "../../../shared/types";
import { reportIpcError } from "./reportError";

export function useChests(): ChestState | null {
  const [chests, setChests] = useState<ChestState | null>(null);

  useEffect(() => {
    let mounted = true;

    void window.tbh
      .getChests()
      .then((c) => {
        if (mounted && c) setChests(c);
      })
      .catch(reportIpcError);

    const off = window.tbh.onChests((c) => setChests(c));
    return () => {
      mounted = false;
      off();
    };
  }, []);

  return chests;
}
