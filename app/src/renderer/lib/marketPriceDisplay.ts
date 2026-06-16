import { formatRawMoney } from "../../core/steamPrice";

export function marketPriceShowsDual(rawMedian: string | null, rawLowest: string | null): boolean {
  return Boolean(rawMedian && rawLowest && rawMedian !== rawLowest);
}

export function marketPriceTooltip(
  rawMedian: string | null,
  rawLowest: string | null,
  currency: string,
): string | undefined {
  if (marketPriceShowsDual(rawMedian, rawLowest)) {
    const med = formatRawMoney(rawMedian, currency) ?? rawMedian;
    const low = formatRawMoney(rawLowest, currency) ?? rawLowest;
    return `Recent sale median: ${med}\nLowest listing: ${low}`;
  }
  if (rawMedian) return "Recent sale median on Steam Market";
  if (rawLowest) return "Lowest listing (no recent sales on Steam)";
  return undefined;
}

export function displayRawMoney(raw: string | null | undefined, currency: string): string | null {
  return formatRawMoney(raw, currency) ?? raw?.trim() ?? null;
}
