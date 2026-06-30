import type { ReactNode } from "react";
import { steamMarketListingUrl } from "../../../core/steamPrice";
import { Tooltip } from "../../design-system/primitives/Tooltip/Tooltip";

export function MarketListingLink({
  hash,
  children,
  title,
}: {
  hash: string;
  children: ReactNode;
  title?: string;
}) {
  return (
    <Tooltip
      trigger={
        <a
          href={steamMarketListingUrl(hash)}
          className="group/price text-inherit no-underline hover:text-accent hover:underline"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </a>
      }
    >
      {title ?? "Open on Steam Market"}
    </Tooltip>
  );
}
