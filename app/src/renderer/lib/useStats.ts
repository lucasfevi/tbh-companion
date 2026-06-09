import { useTbhContext } from "../context/TbhProvider";

export function useStats() {
  return useTbhContext().stats;
}
