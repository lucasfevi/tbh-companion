import { typeLabel } from "../../core/labels";
import { classForGearType } from "../../core/lookup/classRestriction";
import type { LookupItem, LookupMaterialOutcome } from "../../../shared/types";

/** "AttackDamage" -> "Attack Damage", "FireDamagePercent" -> "Fire Damage Percent". */
export function humanizeStatKey(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").trim();
}

/** Gear -> its slot ("Bow"); material -> its kind ("Decoration"). */
export function itemDescriptor(item: LookupItem): string {
  return item.type === "GEAR" ? typeLabel(item.gearType ?? "") : typeLabel(item.materialType ?? "");
}

/** "Lv 80 · Ranger only" — null when neither level nor a class restriction applies. */
export function itemMetaLine(item: LookupItem): string | null {
  const parts: string[] = [];
  if (item.level != null) parts.push(`Lv ${item.level}`);
  const className = classForGearType(item.gearType);
  if (className) parts.push(`${className} only`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Lookup detail: always show percentages with two decimal places. */
export function fmtLookupPct(value: number): string {
  return value.toFixed(2);
}

const UNCAPPED_MATERIAL_TYPES = new Set(["DECORATION", "ENGRAVING"]);
const OUTCOME_CAP = 6;

/**
 * Grid cards have limited room: DECORATION/ENGRAVING materials never exceed
 * the cap anyway, but INSCRIPTION materials can have up to 18 outcomes in a
 * single gearGroup, so those need truncating.
 */
export function visibleOutcomes(
  materialType: string | null,
  outcomes: LookupMaterialOutcome[],
): { shown: LookupMaterialOutcome[]; hiddenCount: number } {
  if (materialType && UNCAPPED_MATERIAL_TYPES.has(materialType)) {
    return { shown: outcomes, hiddenCount: 0 };
  }
  if (outcomes.length <= OUTCOME_CAP) return { shown: outcomes, hiddenCount: 0 };
  return { shown: outcomes.slice(0, OUTCOME_CAP), hiddenCount: outcomes.length - OUTCOME_CAP };
}
