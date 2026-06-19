import { useState } from "react";
import { Button } from "../../design-system/primitives/Button/Button";
import { cn } from "../../lib/cn";
import { reportIpcError } from "../../lib/reportError";

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      className={cn("size-3.5 shrink-0", spinning && "animate-spin")}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5V6h-3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ItemPriceRefreshButton({
  itemKey,
  itemName,
}: {
  itemKey: number;
  itemName: string;
}) {
  const [pending, setPending] = useState(false);

  async function onRefresh(): Promise<void> {
    if (pending) return;
    setPending(true);
    try {
      await window.tbh.refreshItemPrices(itemKey);
    } catch (err) {
      reportIpcError(err, "inventory-item-price-refresh");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      variant="icon"
      type="button"
      edge="end"
      className="shrink-0 text-muted hover:text-fg disabled:opacity-50"
      title={`Refresh Steam prices for ${itemName}`}
      aria-label={`Refresh Steam prices for ${itemName}`}
      disabled={pending}
      onClick={() => void onRefresh()}
    >
      <RefreshIcon spinning={pending} />
    </Button>
  );
}
