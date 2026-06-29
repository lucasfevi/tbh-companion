import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { LookupItem, ResolvedLookupPrice } from "../../shared/types";

let resolved: ResolvedLookupPrice;
vi.mock("../../src/renderer/lib/useLookupPrices", () => ({
  useLookupPrices: () => ({ resolve: () => resolved, generatedUtc: null }),
}));

import { LookupPrice } from "../../src/renderer/components/lookup/LookupPrice";

const item = { name: "Knight Boots" } as LookupItem;

function setResolved(partial: Partial<ResolvedLookupPrice>): void {
  resolved = {
    hash: null,
    state: "not-tradable",
    usd: null,
    amount: null,
    display: null,
    listingUrl: null,
    ...partial,
  };
}

beforeEach(() => setResolved({}));

describe("LookupPrice", () => {
  it("renders a clickable footer price for a priced item", () => {
    setResolved({
      hash: "Knight Boots (Legendary) A",
      state: "priced",
      usd: 1,
      amount: 5,
      display: "R$ 5,00",
      listingUrl: "https://steamcommunity.com/market/listings/3678970/x",
    });
    render(<LookupPrice item={item} variant="footer" interactive />);
    const link = screen.getByRole("link");
    expect(link).toHaveTextContent("R$ 5,00");
    expect(link.getAttribute("href")).toContain("Knight%20Boots");
  });

  it("shows 'No listed price' but stays linked for a tradable no-listing item", () => {
    setResolved({
      hash: "Knight Boots (Legendary) A",
      state: "no-listing",
      listingUrl: "https://x",
    });
    render(<LookupPrice item={item} variant="footer" interactive />);
    expect(screen.getByRole("link")).toHaveTextContent("No listed price");
  });

  it("renders nothing for a non-tradable item", () => {
    setResolved({ state: "not-tradable" });
    const { container } = render(<LookupPrice item={item} variant="footer" interactive />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a non-clickable inline price in a peek", () => {
    setResolved({
      hash: "h",
      state: "priced",
      usd: 1,
      amount: 1,
      display: "$1.00",
      listingUrl: "https://x",
    });
    render(<LookupPrice item={item} variant="inline" />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("$1.00")).toBeInTheDocument();
  });

  it("hides a no-listing price in a non-interactive peek", () => {
    setResolved({ hash: "h", state: "no-listing", listingUrl: "https://x" });
    const { container } = render(<LookupPrice item={item} variant="inline" />);
    expect(container).toBeEmptyDOMElement();
  });
});
