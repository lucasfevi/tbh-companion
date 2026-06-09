import type { ReactNode } from "react";
import { steamMarketListingUrl } from "../../../core/steamPrice";

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
    <a
      href={steamMarketListingUrl(hash)}
      className="market-link"
      target="_blank"
      rel="noopener noreferrer"
      title={title ?? "Open on Steam Market"}
    >
      {children}
    </a>
  );
}
