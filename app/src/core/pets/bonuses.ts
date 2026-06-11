import type { PetRow } from "../../../shared/types";

const BONUS_RE = /^\+(\d+(?:\.\d+)?)%\s+(.+)$/;

/** Sum percentage bonuses from all unlocked pets (passives stack in-game). */
export function aggregatePassiveBonuses(pets: PetRow[]): string[] {
  const totals = new Map<string, number>();
  const order: string[] = [];

  for (const pet of pets) {
    if (!pet.unlocked) continue;
    for (const bonus of pet.bonuses) {
      const match = bonus.match(BONUS_RE);
      if (!match) continue;
      const percent = Number(match[1]);
      const label = match[2];
      if (!totals.has(label)) order.push(label);
      totals.set(label, (totals.get(label) ?? 0) + percent);
    }
  }

  return order.map((label) => `+${totals.get(label)!}% ${label}`);
}
