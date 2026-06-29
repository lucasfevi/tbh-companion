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
 * Steam Market price for a Lookup item.
 * - `variant="footer"` — full-width row at the bottom of the grid card / detail panel.
 * - `variant="inline"` — compact price next to the item name (peek, panel header).
 * - `interactive` — wrap in a link to the Steam listing (grid + panel); peek passes false.
 * Renders nothing for non-tradable items, or for no-listing items in non-interactive peeks.
 */
export function LookupPrice({
  item,
  variant,
  interactive = false,
}: {
  item: LookupItem;
  variant: "footer" | "inline";
  interactive?: boolean;
}) {
  const { resolve } = useLookupPrices();
  const price = resolve(item);

  if (price.state === "not-tradable") return null;
  if (price.state === "no-listing" && !interactive) return null;

  const isNoListing = price.state === "no-listing";
  const value = (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap",
        isNoListing ? "italic text-muted" : "font-medium text-accent",
      )}
    >
      {isNoListing ? "No listed price" : price.display}
      {interactive ? <LuExternalLink className="size-3 text-muted" aria-hidden /> : null}
    </span>
  );

  if (variant === "inline") {
    const body = (
      <span className="inline-flex items-center gap-1 text-[12px]">
        <SiSteam className="size-3 text-muted" aria-hidden />
        {value}
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

  const row = (
    <span className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
        <SiSteam className="size-3.5" aria-hidden />
        Steam Market
      </span>
      {value}
    </span>
  );
  return (
    <div className="mt-2 border-t border-border/60 pt-2 text-[13px]">
      {price.hash ? (
        <MarketListingLink hash={price.hash} title={steamTitle(isNoListing)}>
          {row}
        </MarketListingLink>
      ) : (
        row
      )}
    </div>
  );
}
