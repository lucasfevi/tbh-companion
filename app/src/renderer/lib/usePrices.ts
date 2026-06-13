import { useTbhContext } from "../context/tbhContext";

export function usePriceStatus() {
  return useTbhContext().priceStatus;
}

export function usePriceProgress() {
  return useTbhContext().priceProgress;
}

export function useLastPriceRefreshMessage() {
  return useTbhContext().lastPriceRefreshMessage;
}

export function usePriceActions() {
  const { setPriceStatus, clearPriceProgress, clearLastPriceRefreshMessage } = useTbhContext();
  return { setPriceStatus, clearPriceProgress, clearLastPriceRefreshMessage };
}
