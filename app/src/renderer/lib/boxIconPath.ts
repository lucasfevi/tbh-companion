/** Stage-box keys (910/920/930xxx) share three category icons in data/icons/. */
export function boxIconPath(boxItemKey: number): string {
  const id = String(boxItemKey);
  if (id.startsWith("930")) return "item-930011";
  if (id.startsWith("920")) return "item-920011";
  if (id.startsWith("910")) return "item-910011";
  return `item-${boxItemKey}`;
}
