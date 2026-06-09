/** "GEAR" -> "Gear", "MATERIAL" -> "Material". */
export function typeLabel(type: string): string {
  if (!type || type === "UNKNOWN") return "Unknown";
  return type[0] + type.slice(1).toLowerCase();
}

export { gradeTitle as gradeLabel } from "./grades";
