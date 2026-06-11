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
      className="text-inherit no-underline hover:text-accent hover:underline"
      target="_blank"
      rel="noopener noreferrer"
      title={title ?? "Open on Steam Market"}
    >
      {children}
    </a>
  );
}
