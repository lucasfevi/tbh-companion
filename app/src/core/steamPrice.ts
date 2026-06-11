// Steam currency codes + price-text parsing.
//
// Steam's priceoverview returns locale-formatted strings ("$0.04", "R$ 0,17",
// "1.234,56 zl", ...). We keep the raw text for display and derive a numeric
// value for summing. The currency param of priceoverview is honored (unlike
// search/render) - see docs/findings/steam-market.md.

import type { InventoryPriceInfo } from "../../shared/types";

export const TBH_STEAM_APP_ID = 3678970;

/** Link to a Steam Community Market listing for this hash name. */
export function steamMarketListingUrl(marketHashName: string, appId = TBH_STEAM_APP_ID): string {
  return `https://steamcommunity.com/market/listings/${appId}/${encodeURIComponent(marketHashName)}`;
}

/** Prefer median (recent sales) over lowest listing for the same market_hash_name. */
export function pickMarketUnit(price: InventoryPriceInfo): {
  unit: number | null;
  raw: string | null;
  source: "median" | "lowest" | null;
} {
  if (price.median != null) {
    return { unit: price.median, raw: price.rawMedian, source: "median" };
  }
  if (price.lowest != null) {
    return { unit: price.lowest, raw: price.rawLowest, source: "lowest" };
  }
  return { unit: null, raw: null, source: null };
}

export interface SteamCurrency {
  code: number; // Steam's numeric currency id
  iso: string; // ISO 4217-ish code we expose in config/UI
  label: string;
  prefix: string; // display prefix before amounts (e.g. "R$ ", "$")
}

// Common subset of Steam's wallet currencies. Extend as needed.
export const STEAM_CURRENCIES: SteamCurrency[] = [
  { code: 1, iso: "USD", label: "US Dollar", prefix: "$" },
  { code: 2, iso: "GBP", label: "British Pound", prefix: "£" },
  { code: 3, iso: "EUR", label: "Euro", prefix: "€" },
  { code: 4, iso: "CHF", label: "Swiss Franc", prefix: "CHF " },
  { code: 5, iso: "RUB", label: "Russian Ruble", prefix: "₽" },
  { code: 6, iso: "PLN", label: "Polish Zloty", prefix: "" }, // Steam uses "1,23 zł" suffix
  { code: 7, iso: "BRL", label: "Brazilian Real", prefix: "R$ " },
  { code: 8, iso: "JPY", label: "Japanese Yen", prefix: "¥" },
  { code: 9, iso: "NOK", label: "Norwegian Krone", prefix: "kr " },
  { code: 10, iso: "IDR", label: "Indonesian Rupiah", prefix: "Rp " },
  { code: 12, iso: "PHP", label: "Philippine Peso", prefix: "P" },
  { code: 13, iso: "SGD", label: "Singapore Dollar", prefix: "S$" },
  { code: 15, iso: "VND", label: "Vietnamese Dong", prefix: "" }, // Steam uses "181.500₫" suffix
  { code: 16, iso: "KRW", label: "South Korean Won", prefix: "₩" },
  { code: 17, iso: "TRY", label: "Turkish Lira", prefix: "₺" },
  { code: 18, iso: "UAH", label: "Ukrainian Hryvnia", prefix: "" }, // Steam uses "3,24₴" suffix
  { code: 19, iso: "MXN", label: "Mexican Peso", prefix: "Mex$ " },
  { code: 20, iso: "CAD", label: "Canadian Dollar", prefix: "C$" },
  { code: 21, iso: "AUD", label: "Australian Dollar", prefix: "A$" },
  { code: 23, iso: "CNY", label: "Chinese Yuan", prefix: "¥" },
  { code: 24, iso: "INR", label: "Indian Rupee", prefix: "₹" },
  { code: 29, iso: "HKD", label: "Hong Kong Dollar", prefix: "HK$ " },
];

const BY_ISO = new Map(STEAM_CURRENCIES.map((c) => [c.iso, c]));

export function currencyByIso(iso: string): SteamCurrency {
  return BY_ISO.get(iso.toUpperCase()) ?? STEAM_CURRENCIES[0];
}

export function currencyCode(iso: string): number {
  return currencyByIso(iso).code;
}

/** Display prefix for formatted amounts (e.g. BRL -> "R$ "). */
export function currencyPrefix(iso: string): string {
  return currencyByIso(iso).prefix;
}

/** ISO codes that use comma as the decimal separator in display. */
const COMMA_DECIMAL = new Set(["BRL", "EUR", "PLN", "TRY", "RUB", "NOK", "UAH", "VND"]);

/** ISO codes shown without fractional digits (whole units). */
const INTEGER_MONEY = new Set(["JPY", "KRW"]);

/** Format a numeric amount for display in the chosen currency. */
export function formatMoney(amount: number, iso: string): string {
  const code = iso.toUpperCase();
  const prefix = currencyPrefix(code);
  if (INTEGER_MONEY.has(code)) {
    return `${prefix}${Math.round(amount).toLocaleString("en-US")}`;
  }
  const fixed = amount.toFixed(2);
  const body = COMMA_DECIMAL.has(code) ? fixed.replace(".", ",") : fixed;
  return `${prefix}${body}`;
}

/**
 * Parse a Steam money string into a numeric value in major units.
 *
 * The last `,` or `.` is the decimal point UNLESS it's followed by exactly 3
 * digits, in which case it's a thousands grouping separator (so "1,500" -> 1500
 * for KRW, but "0,17" -> 0.17 for BRL). Earlier separators are always grouping.
 * Returns null when no digits are present.
 */
export function parseMoney(text: string | null | undefined): number | null {
  if (!text) return null;
  const cleaned = text.replace(/[^0-9.,]/g, "");
  if (!cleaned) return null;

  const lastSep = Math.max(cleaned.lastIndexOf(","), cleaned.lastIndexOf("."));
  const trailing = lastSep === -1 ? 0 : cleaned.length - lastSep - 1;
  const isDecimal = lastSep !== -1 && trailing !== 3;

  let value: number;
  if (!isDecimal) {
    value = Number(cleaned.replace(/[.,]/g, ""));
  } else {
    const intPart = cleaned.slice(0, lastSep).replace(/[.,]/g, "");
    const fracPart = cleaned.slice(lastSep + 1).replace(/[.,]/g, "");
    value = Number(`${intPart}.${fracPart}`);
  }
  return Number.isFinite(value) ? value : null;
}
