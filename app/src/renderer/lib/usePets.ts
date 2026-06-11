import { useEffect, useState } from "react";
import type { PetState } from "../../../shared/types";
import { reportIpcError } from "./reportError";

export function usePets(): PetState | null {
  const [pets, setPets] = useState<PetState | null>(null);

  useEffect(() => {
    let mounted = true;

    void window.tbh
      .getPets()
      .then((p) => {
        if (mounted && p) setPets(p);
      })
      .catch(reportIpcError);

    const off = window.tbh.onPets((p) => setPets(p));
    return () => {
      mounted = false;
      off();
    };
  }, []);

  return pets;
}
