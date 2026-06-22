import { useCallback, useState } from "react";

export type LookupNavType = "item" | "box" | "stage";

export interface LookupNavNode {
  type: LookupNavType;
  id: number;
}

/** Tracks the Lookup tab's current detail-panel node (forward-only navigation). */
export function useLookupNav(initial?: LookupNavNode) {
  const [current, setCurrent] = useState<LookupNavNode | null>(initial ?? null);

  const push = useCallback((node: LookupNavNode) => {
    setCurrent(node);
  }, []);

  const reset = useCallback((node?: LookupNavNode) => {
    setCurrent(node ?? null);
  }, []);

  return { current, push, reset };
}
