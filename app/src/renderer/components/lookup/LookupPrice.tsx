import { SiSteam } from "react-icons/si";
import { LuExternalLink } from "react-icons/lu";
import type { LookupItem } from "../../../../shared/types";
import { cn } from "../../lib/cn";
import { useLookupPrices } from "../../lib/useLookupPrices";
import { MarketListingLink } from "../inventory/MarketListingLink";

function steamTitle(isNoListing: boolean): string {
  return isNoListing
    ? "No active Steam Market listing — open to check the latest"
    : "Approximate Steam Market price (converted from USD) — open the listing";
}

/**
 * Compact Steam Market price pinned to the top-right of an item's header
 * (grid card, detail panel, and peek). `interactive` wraps it in a link to the
 * Steam listing — true for grid cards and the detail panel, false for peeks.
 * Renders nothing for non-tradable items, or for no-listing items in a
 * non-interactive peek (kept clean).
 */
export function LookupPrice({
  item,
  interactive = false,
}: {
  item: LookupItem;
  interactive?: boolean;
}) {
  const { resolve } = useLookupPrices();
  const price = resolve(item);

  if (price.state === "not-tradable") return null;
  if (price.state === "no-listing" && !interactive) return null;

  const isNoListing = price.state === "no-listing";
  const label = isNoListing ? "No listed price" : price.display;
  const body = (
    <span className="inline-flex items-center gap-1 text-[12px]">
      <SiSteam className="size-3 text-muted" aria-hidden />
      <span
        className={cn(
          "inline-flex items-center gap-1 whitespace-nowrap",
          isNoListing ? "italic text-muted" : "font-medium text-accent",
        )}
      >
        {/* Plain inline span so the link underline reaches the text — an
            inline-flex ancestor would otherwise block text-decoration. */}
        <span className="group-hover/price:underline">{label}</span>
        {interactive ? <LuExternalLink className="size-3 text-muted" aria-hidden /> : null}
      </span>
    </span>
  );

  if (interactive && price.hash) {
    return (
      <MarketListingLink hash={price.hash} title={steamTitle(isNoListing)}>
        {body}
      </MarketListingLink>
    );
  }
  return body;
}
