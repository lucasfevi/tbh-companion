import { useState } from "react";
import { formatMoney } from "../../../core/steamPrice";
import { GradeBars } from "./GradeBars";
import type { ResolvedInventory } from "../../../../shared/types";
import { reportIpcError } from "../../lib/reportError";
import { Button } from "../ui/Button";
import { HintBanner } from "../ui/HintBanner";
import { StatCard } from "../ui/StatCard";
import { TabMetricHero } from "../ui/TabMetricHero";

const LIST_VALUE_TIP = "Total list value at Steam market prices (what buyers pay)";
const NET_FEES_TIP =
  "Estimated wallet proceeds if you listed everything at market prices. Steam listing UI is authoritative.";
const INSTANT_SELL_TIP =
  "Sum of instant sell per row: highest buy order price × min(your stack, units on the book at that price). No listing fees.";

export function InventorySummary({ inv, currency }: { inv: ResolvedInventory; currency: string }) {
  const c = inv.composition;
  const [catalogBusy, setCatalogBusy] = useState(false);
  const [catalogMessage, setCatalogMessage] = useState<string | null>(null);

  const hasListValue = c.valuedTotal != null && Number.isFinite(c.valuedTotal) && c.valuedTotal > 0;
  const feeDetail =
    hasListValue && c.feeTotal > 0
      ? `−${formatMoney(c.feeTotal, currency)} Steam fees (estimate)`
      : undefined;

  const netAfterFees =
    hasListValue && c.netAfterFeesTotal != null && Number.isFinite(c.netAfterFeesTotal)
      ? formatMoney(c.netAfterFeesTotal, currency)
      : "-";

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
      <TabMetricHero
        primary={
          <div className="flex cursor-help items-baseline gap-2" title={LIST_VALUE_TIP}>
            <span className="text-[40px] font-bold leading-none text-accent">
              {hasListValue ? formatMoney(c.valuedTotal, currency) : "-"}
            </span>
            <span className="text-[13px] tracking-wide text-muted">Market value</span>
          </div>
        }
        center={
          <>
            <div
              className="cursor-help text-[15px] font-semibold leading-tight text-gold"
              title={NET_FEES_TIP}
            >
              {netAfterFees} after Steam fees
            </div>
            {feeDetail ? <div className="text-xs text-muted">{feeDetail}</div> : null}
          </>
        }
      />

      <section className="grid grid-cols-3 gap-2.5">
        <StatCard label="Items owned" value={(c.total ?? 0).toLocaleString()} />
        <StatCard label="Distinct" value={inv.rows.length.toLocaleString()} />
        <StatCard
          label="Instant sell total"
          title={INSTANT_SELL_TIP}
          value={
            c.buyOrderValuedTotal != null &&
            Number.isFinite(c.buyOrderValuedTotal) &&
            c.buyOrderValuedTotal > 0
              ? formatMoney(c.buyOrderValuedTotal, currency)
              : "-"
          }
        />
      </section>

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
