import { formatMoney } from "../../../core/steamPrice";
import { GradeBars } from "./GradeBars";
import type { InventoryComposition } from "../../../../shared/types";
import { HintBanner } from "../../design-system/primitives/HintBanner/HintBanner";
import { StatCard } from "../../design-system/primitives/StatCard/StatCard";
import { Tooltip } from "../../design-system/primitives/Tooltip/Tooltip";
import { ExternalLink } from "../ui/ExternalLink";
import { DISCORD_URL } from "../../lib/externalLinks";

const LIST_VALUE_TIP = "Total list value at Steam market prices (what buyers pay)";
const ESTIMATE_TIP =
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
  const hasFees = hasListValue && c.feeTotal > 0;

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
            <span>
              <span className="font-semibold text-gold">{netAfterFees}</span> after Steam fees
              {hasFees ? (
                <span className="block">
                  −{formatMoney(c.feeTotal, currency)} Steam fees (
                  <Tooltip underline trigger={<span tabIndex={0}>estimate</span>}>
                    {ESTIMATE_TIP}
                  </Tooltip>
                  )
                </span>
              ) : null}
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
          {c.unknownCount} item(s) aren&apos;t in this app&apos;s item list (shown as Unknown #…).
          Update the app, or check our <ExternalLink href={DISCORD_URL}>Discord</ExternalLink> for
          work in progress on those IDs.
        </HintBanner>
      )}
    </>
  );
}
