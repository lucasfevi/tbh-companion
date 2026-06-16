/** Wallet proceeds when selling up to order-book depth at the top buy price. */
export function instantSellValue(
  buyOrderUnit: number,
  ownedCount: number,
  buyOrderQuantity: number | null | undefined,
): number | null {
  if (!Number.isFinite(buyOrderUnit) || buyOrderUnit <= 0) return null;
  if (ownedCount <= 0) return null;
  const depth = buyOrderQuantity ?? 0;
  if (!Number.isFinite(depth) || depth <= 0) return null;
  return buyOrderUnit * Math.min(ownedCount, Math.trunc(depth));
}
