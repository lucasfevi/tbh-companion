import { useEffect, useState } from "react";
import type { LookupItem } from "../../../shared/types";
import { reportIpcError } from "./reportError";

/** Bundled item catalog — static for the build, fetched once. */
export function useLookupCatalog(): LookupItem[] | null {
  const [items, setItems] = useState<LookupItem[] | null>(null);

  useEffect(() => {
    let mounted = true;
    void window.tbh
      .getLookupCatalog()
      .then((catalog) => {
        if (mounted) setItems(catalog);
      })
      .catch(reportIpcError);
    return () => {
      mounted = false;
    };
  }, []);

  return items;
}
