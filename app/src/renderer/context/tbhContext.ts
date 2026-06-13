import { createContext, useContext } from "react";
import type { Stats, ResolvedInventory, PriceStatus, PriceProgress } from "../../../shared/types";

export interface TbhContextValue {
  stats: Stats | null;
  inventory: ResolvedInventory | null;
  priceStatus: PriceStatus | null;
  priceProgress: PriceProgress | null;
  lastPriceRefreshMessage: string | null;
  setPriceStatus: (status: PriceStatus | null) => void;
  clearPriceProgress: () => void;
  clearLastPriceRefreshMessage: () => void;
}

export const TbhContext = createContext<TbhContextValue | null>(null);

export function useTbhContext(): TbhContextValue {
  const ctx = useContext(TbhContext);
  if (!ctx) {
    throw new Error("TbhProvider missing — wrap the renderer root in main.tsx");
  }
  return ctx;
}
