import { useTbhContext } from "../context/TbhProvider";

export function useInventory() {
  return useTbhContext().inventory;
}
