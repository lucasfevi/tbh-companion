import { useCallback, useMemo, useState } from "react";
import { EntityPanelContext } from "./entityPanelContext";
import type { LookupNavNode } from "../lib/useLookupNav";

export function EntityPanelProvider({ children }: { children: React.ReactNode }) {
  const [node, setNode] = useState<LookupNavNode | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback((n: LookupNavNode) => {
    setNode(n);
    setIsOpen(true);
  }, []);

  const navigate = useCallback((n: LookupNavNode) => {
    setNode(n);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = useMemo(
    () => ({ node, open, navigate, close, isOpen }),
    [node, open, navigate, close, isOpen],
  );

  return <EntityPanelContext.Provider value={value}>{children}</EntityPanelContext.Provider>;
}
