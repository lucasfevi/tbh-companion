import { useState } from "react";
import { formatMoney } from "../../../core/steamPrice";
import { GradeBars } from "./GradeBars";
import type { ResolvedInventory } from "../../../../shared/types";
import { reportIpcError } from "../../lib/reportError";
import { Button } from "../ui/Button";
import { HintBanner } from "../ui/HintBanner";
import { LinkButton } from "../ui/LinkButton";
import { StatCard } from "../ui/StatCard";

export function InventorySummary({
  inv,
  chestTotal,
  currency,
  onViewChests,
}: {
  inv: ResolvedInventory;
  chestTotal: number;
  currency: string;
  onViewChests?: () => void;
}) {
  const c = inv.composition;
  const [catalogBusy, setCatalogBusy] = useState(false);
  const [catalogMessage, setCatalogMessage] = useState<string | null>(null);

  async function onRefreshCatalog() {
    setCatalogBusy(true);
    setCatalogMessage(null);
    try {
      const before = c.unknownCount ?? 0;
      const result = await window.tbh.refreshGameData();
      if (result.ok) {
        const after = result.status.count;
        setCatalogMessage(
          `Catalog updated (${after.toLocaleString()} items).` +
            (before > 0 ? " Remaining unknown items may not be listed on tbh.city yet." : ""),
        );
      } else {
        setCatalogMessage(`Refresh failed: ${result.error ?? "could not fetch catalog"}.`);
      }
    } catch (err) {
      reportIpcError(err);
      setCatalogMessage("Refresh failed — check your connection and try again.");
    } finally {
      setCatalogBusy(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-4 gap-2.5">
        <StatCard valueFirst label="items owned" value={(c.total ?? 0).toLocaleString()} />
        <StatCard valueFirst label="distinct" value={inv.rows.length.toLocaleString()} />
        <StatCard
          valueFirst
          label="Steam value (priced)"
          value={
            c.valuedTotal != null && Number.isFinite(c.valuedTotal)
              ? formatMoney(c.valuedTotal, currency)
              : "-"
          }
        />
        <StatCard
          valueFirst
          label={
            <>
              unopened chests
              {onViewChests ? (
                <>
                  {" "}
                  <LinkButton onClick={onViewChests}>View chests →</LinkButton>
                </>
              ) : null}
            </>
          }
          value={chestTotal.toLocaleString()}
        />
      </div>
      <GradeBars composition={c} />
      {(c.unknownCount ?? 0) > 0 && (
        <HintBanner>
          {c.unknownCount} item(s) are not in the catalog (Unknown #id).{" "}
          <Button
            size="sm"
            className="ml-1.5"
            disabled={catalogBusy}
            onClick={() => void onRefreshCatalog()}
          >
            {catalogBusy ? "Refreshing…" : "Refresh catalog"}
          </Button>
        </HintBanner>
      )}
      {catalogMessage ? <HintBanner>{catalogMessage}</HintBanner> : null}
    </>
  );
}
