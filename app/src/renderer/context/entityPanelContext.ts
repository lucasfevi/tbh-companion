import { createContext, useContext } from "react";
import type { LookupNavNode } from "../lib/useLookupNav";

export interface EntityPanelContextValue {
  node: LookupNavNode | null;
  open: (node: LookupNavNode) => void;
  navigate: (node: LookupNavNode) => void;
  close: () => void;
  isOpen: boolean;
}

export const EntityPanelContext = createContext<EntityPanelContextValue | null>(null);

export function useEntityPanel(): EntityPanelContextValue {
  const ctx = useContext(EntityPanelContext);
  if (!ctx) throw new Error("useEntityPanel must be used within EntityPanelProvider");
  return ctx;
}
