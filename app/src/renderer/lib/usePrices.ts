import { useTbhContext } from "../context/TbhProvider";

export function usePriceStatus() {
  return useTbhContext().priceStatus;
}

export function usePriceProgress() {
  return useTbhContext().priceProgress;
}

export function usePriceActions() {
  const { setPriceStatus, clearPriceProgress } = useTbhContext();
  return { setPriceStatus, clearPriceProgress };
}
