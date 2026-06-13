import { useTbhContext } from "../context/tbhContext";

export function useInventory() {
  return useTbhContext().inventory;
}
