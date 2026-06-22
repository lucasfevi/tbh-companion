import { useEffect, useState } from "react";
import type { SynthesisModel } from "../../../shared/types";
import { reportIpcError } from "./reportError";

/** Synthesis grade/recipe/bucket tables — static for the build, fetched once. */
export function useLookupSynthesisModel(): SynthesisModel | null {
  const [model, setModel] = useState<SynthesisModel | null>(null);

  useEffect(() => {
    let mounted = true;
    void window.tbh
      .getLookupSynthesisModel()
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
