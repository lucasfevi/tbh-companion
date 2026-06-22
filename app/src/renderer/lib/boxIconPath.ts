/** Stage-box keys (910/920/930xxx) share three category icons in data/icons/. */
export function boxIconPath(boxItemKey: number): string {
  const id = String(boxItemKey);
  if (id.startsWith("930")) return "Item_930011";
  if (id.startsWith("920")) return "Item_920011";
  if (id.startsWith("910")) return "Item_910011";
  return `Item_${boxItemKey}`;
}
