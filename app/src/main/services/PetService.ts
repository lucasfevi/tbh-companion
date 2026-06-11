import {
  buildPetState,
  loadPetCatalog,
  parseArrangedPetKey,
  parseMonsterKillCounts,
  parsePetSaveData,
} from "../../core/pets";
import type { PetState } from "../../../shared/types";
import { IPC } from "../../../shared/ipc";
import { broadcast } from "./broadcast";
import { createLogger } from "../log";

const log = createLogger("pets");

export class PetService {
  private readonly catalog = loadPetCatalog();
  private lastPets: PetState | null = null;

  onSave(text: string, mtime: number): void {
    try {
      const saveRows = parsePetSaveData(text);
      const killCounts = parseMonsterKillCounts(text);
      const arrangedPetKey = parseArrangedPetKey(text);
      this.lastPets = buildPetState(this.catalog, saveRows, killCounts, arrangedPetKey, mtime);
      broadcast(IPC.PETS, this.lastPets);
    } catch (err) {
      log.error(`onSave pets failed: ${String(err)}`);
    }
  }

  getPets(): PetState | null {
    return this.lastPets;
  }
}
