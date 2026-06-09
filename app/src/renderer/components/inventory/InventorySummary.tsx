import { useState } from "react";
import { formatMoney } from "../../../core/steamPrice";
import { GradeBars } from "./GradeBars";
import type { ResolvedInventory } from "../../../../shared/types";
import { reportIpcError } from "../../lib/reportError";

export function InventorySummary({
  inv,
  chestTotal,
  currency,
}: {
  inv: ResolvedInventory;
  chestTotal: number;
  currency: string;
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
            (before > 0
              ? " Remaining unknown items may not be listed on tbh.city yet."
              : ""),
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
      <div className="inv-cards">
        <div className="stat">
          <div className="stat-value">{(c.total ?? 0).toLocaleString()}</div>
          <div className="stat-label">items owned</div>
        </div>
        <div className="stat">
          <div className="stat-value">{inv.rows.length.toLocaleString()}</div>
          <div className="stat-label">distinct</div>
        </div>
        <div className="stat">
          <div className="stat-value">
            {c.valuedTotal != null && Number.isFinite(c.valuedTotal)
              ? formatMoney(c.valuedTotal, currency)
              : "-"}
          </div>
          <div className="stat-label">Steam value (priced)</div>
        </div>
        <div className="stat">
          <div className="stat-value">{chestTotal.toLocaleString()}</div>
          <div className="stat-label">unopened chests</div>
        </div>
      </div>
      <GradeBars composition={c} />
      {(c.unknownCount ?? 0) > 0 && (
        <div className="inv-hint">
          {c.unknownCount} item(s) are not in the catalog (Unknown #id).{" "}
          <button
            type="button"
            className="btn small-btn"
            disabled={catalogBusy}
            onClick={() => void onRefreshCatalog()}
          >
            {catalogBusy ? "Refreshing…" : "Refresh catalog"}
          </button>
        </div>
      )}
      {catalogMessage && <div className="inv-hint">{catalogMessage}</div>}
    </>
  );
}
