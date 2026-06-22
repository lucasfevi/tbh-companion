// Weapon gearType -> hero class. Armor/accessory gearTypes are class-agnostic
// and intentionally absent from this map. Source: tbh-data's
// companion/knowledge/class_equip_rules.json (six classes, two weapon
// gearTypes each — main-hand and off-hand).
const GEARTYPE_CLASS: Record<string, string> = {
  SWORD: "Knight",
  SHIELD: "Knight",
  BOW: "Ranger",
  ARROW: "Ranger",
  STAFF: "Sorcerer",
  ORB: "Sorcerer",
  SCEPTER: "Priest",
  TOME: "Priest",
  CROSSBOW: "Hunter",
  BOLT: "Hunter",
  AXE: "Slayer",
  HATCHET: "Slayer",
};

export const LOOKUP_CLASS_ORDER = [
  "Knight",
  "Ranger",
  "Sorcerer",
  "Priest",
  "Hunter",
  "Slayer",
] as const;

export function classForGearType(gearType: string | null): string | null {
  if (!gearType) return null;
  return GEARTYPE_CLASS[gearType] ?? null;
}
