import { useEffect, useState } from "react";
import type { LookupSources } from "../../../shared/types";
import { reportIpcError } from "./reportError";

/** Item/box/stage source graph — static for the build, fetched once. */
export function useLookupSources(): LookupSources | null {
  const [sources, setSources] = useState<LookupSources | null>(null);

  useEffect(() => {
    let mounted = true;
    void window.tbh
      .getLookupSources()
      .then((s) => {
        if (mounted) setSources(s);
      })
      .catch(reportIpcError);
    return () => {
      mounted = false;
    };
  }, []);

  return sources;
}
