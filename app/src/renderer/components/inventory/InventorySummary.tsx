import { formatMoney } from "../../../core/steamPrice";
import { GradeBars } from "./GradeBars";
import type { InventoryComposition } from "../../../../shared/types";
import { HintBanner } from "../../design-system/primitives/HintBanner/HintBanner";
import { StatCard } from "../../design-system/primitives/StatCard/StatCard";

const LIST_VALUE_TIP = "Total list value at Steam market prices (what buyers pay)";
const NET_FEES_TIP =
  "Estimated wallet proceeds if you listed everything at market prices. Steam listing UI is authoritative.";
const INSTANT_SELL_TIP =
  "Sum of instant sell per row: selling into the order book level-by-level, best price first, until your stack is covered or the book runs dry. No listing fees.";

export function InventorySummary({
  composition,
  currency,
}: {
  composition: InventoryComposition;
  currency: string;
}) {
  const c = composition;

  const hasListValue = c.valuedTotal != null && Number.isFinite(c.valuedTotal) && c.valuedTotal > 0;
  const feeDetail =
    hasListValue && c.feeTotal > 0
      ? `−${formatMoney(c.feeTotal, currency)} Steam fees (estimate)`
      : undefined;

  const netAfterFees =
    hasListValue && c.netAfterFeesTotal != null && Number.isFinite(c.netAfterFeesTotal)
      ? formatMoney(c.netAfterFeesTotal, currency)
      : "-";

  const hasInstantValue =
    c.buyOrderValuedTotal != null &&
    Number.isFinite(c.buyOrderValuedTotal) &&
    c.buyOrderValuedTotal > 0;

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 max-[560px]:grid-cols-1">
        <StatCard
          variant="highlight"
          label="Market value"
          title={LIST_VALUE_TIP}
          value={hasListValue ? formatMoney(c.valuedTotal, currency) : "-"}
          detail={
            <span title={NET_FEES_TIP}>
              <span className="font-semibold text-gold">{netAfterFees}</span> after Steam fees
              {feeDetail ? <span className="block">{feeDetail}</span> : null}
            </span>
          }
        />

        <StatCard
          variant="highlight"
          label="Instant total"
          title={INSTANT_SELL_TIP}
          value={hasInstantValue ? formatMoney(c.buyOrderValuedTotal, currency) : "-"}
        />
      </div>

      <GradeBars composition={c} />
      {(c.unknownCount ?? 0) > 0 && (
        <HintBanner>
          {c.unknownCount} item(s) are not in the bundled catalog (Unknown #id). Update the app when
          a new game version adds items.
        </HintBanner>
      )}
    </>
  );
}
