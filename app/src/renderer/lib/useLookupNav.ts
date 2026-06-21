import { useCallback, useMemo, useState } from "react";

export type LookupNavType = "item" | "box" | "stage";

export interface LookupNavNode {
  type: LookupNavType;
  id: number;
}

function sameNode(a: LookupNavNode, b: LookupNavNode): boolean {
  return a.type === b.type && a.id === b.id;
}

/** History stack driving the Lookup tab's detail panel (hover peek + breadcrumb drill). */
export function useLookupNav(initial?: LookupNavNode) {
  const [stack, setStack] = useState<LookupNavNode[]>(initial ? [initial] : []);

  const push = useCallback((node: LookupNavNode) => {
    setStack((prev) => {
      const top = prev[prev.length - 1];
      if (top && sameNode(top, node)) return prev;
      return [...prev, node];
    });
  }, []);

  const back = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const jumpTo = useCallback((index: number) => {
    setStack((prev) => (index >= 0 && index < prev.length - 1 ? prev.slice(0, index + 1) : prev));
  }, []);

  const reset = useCallback((node?: LookupNavNode) => {
    setStack(node ? [node] : []);
  }, []);

  const current = useMemo(() => stack[stack.length - 1] ?? null, [stack]);

  return { stack, current, push, back, jumpTo, reset };
}
