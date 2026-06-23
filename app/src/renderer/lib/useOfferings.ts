import { useEffect, useState } from "react";
import type { OfferingsModel } from "../../../shared/types";
import { reportIpcError } from "./reportError";

/** Per-coin offering loot tables — static for the build, fetched once. */
export function useOfferings(): OfferingsModel | null {
  const [model, setModel] = useState<OfferingsModel | null>(null);

  useEffect(() => {
    let mounted = true;
    void window.tbh
      .getOfferings()
      .then((m) => {
        if (mounted) setModel(m);
      })
      .catch(reportIpcError);
    return () => {
      mounted = false;
    };
  }, []);

  return model;
}
