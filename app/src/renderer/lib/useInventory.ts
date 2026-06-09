import { useEffect, useState } from "react";
import type { ResolvedInventory } from "../../../shared/types";

// Subscribes to the resolved inventory pushed from the main process (and pulls
// the last value on mount). Updates whenever the save changes (~every 2 min).
export function useInventory(): ResolvedInventory | null {
  const [inv, setInv] = useState<ResolvedInventory | null>(null);

  useEffect(() => {
    let mounted = true;
    window.tbh
      .getInventory()
      .then((v) => {
        if (mounted && v) setInv(v);
      })
      .catch(() => {
        /* ignore - first push will populate */
      });
    const off = window.tbh.onInventory((v) => setInv(v));
    return () => {
      mounted = false;
      off();
    };
  }, []);

  return inv;
}
