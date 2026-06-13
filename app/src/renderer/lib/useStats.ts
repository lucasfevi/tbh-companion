import { useTbhContext } from "../context/tbhContext";

export function useStats() {
  return useTbhContext().stats;
}
