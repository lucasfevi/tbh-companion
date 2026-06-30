import { useStats } from "./lib/useStats";
import { useInventory } from "./lib/useInventory";
import { usePriceProgress, usePriceStatus } from "./lib/usePrices";
import { fmtCompact } from "./lib/format";
import { formatMoney } from "../core/steamPrice";
import { stageName } from "../core/stages";
import { Button } from "./design-system/primitives/Button/Button";
import { OverlayFrame } from "./components/ui/OverlayFrame";

const RATE_TIP =
  "XP/hour updates only when the game writes new XP to the save (often up to " +
  "3 minutes apart, sometimes longer). It holds steady between writes instead of decaying.";
const GOLD_TIP =
  "Gold earned per hour. Counts gold gained only; spending (upgrades, Cube, " +
  "runes) is ignored, so it's accurate while farming.";

export function Overlay() {
  const stats = useStats();
  const inv = useInventory();
  const priceStatus = usePriceStatus();
  const priceProgress = usePriceProgress();

  const currency = inv?.currency ?? priceStatus?.currency ?? "USD";
  const invValue = inv?.composition.valuedTotal ?? null;
  const pricing = priceStatus?.running ?? false;
  const pricingLabel = priceProgress
    ? `pricing ${priceProgress.done}/${priceProgress.total}…`
    : "pricing…";

  return (
    <OverlayFrame>
      <div className="flex items-center justify-between">
        <span className="whitespace-nowrap text-[10px] font-bold tracking-wide text-muted">
          TBH Companion
        </span>
        <div className="no-drag flex gap-1">
          {/* nativeTitle: this frameless 280x94 window never hosts a Base UI
              portal (DESIGN-SYSTEM.md) - a Tooltip popup escaping its bounds
              would be visually broken, so these keep the plain title attribute. */}
          <Button
            variant="icon"
            type="button"
            className="text-xs"
            title="Reset session stats"
            nativeTitle
            onClick={() => window.tbh.reset()}
          >
            {"\u21bb"}
          </Button>
          <Button
            variant="icon"
            type="button"
            className="text-xs"
            title="Open full window"
            nativeTitle
            onClick={() => window.tbh.showMain()}
          >
            {"\u2922"}
          </Button>
          <Button
            variant="icon"
            type="button"
            edge="end"
            className="text-xs"
            title="Close mini overlay (app keeps running in the tray)"
            nativeTitle
            onClick={() => window.tbh.closeOverlay()}
          >
            {"\u2715"}
          </Button>
        </div>
      </div>

      {!stats ? (
        <p className="m-0 text-muted">Connecting...</p>
      ) : (
        <div className="flex flex-col gap-1">
          {/* Native title (not Tooltip): this frameless window never hosts a
              Base UI portal - see DESIGN-SYSTEM.md "Base UI portals are safe
              per-window". */}
          <div className="flex items-baseline justify-between gap-2.5">
            <p className="m-0 flex min-w-0 cursor-help items-baseline gap-1" title={RATE_TIP}>
              <span className="text-2xl font-bold leading-none tabular-nums text-accent">
                {fmtCompact(stats.rollingRate)}
              </span>
              <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider text-muted">
                XP/hr
              </span>
            </p>
            <p
              className="m-0 flex min-w-0 cursor-help items-baseline gap-1 text-right"
              title={GOLD_TIP}
            >
              <span className="text-base font-semibold leading-none tabular-nums text-gold">
                {fmtCompact(stats.goldRate)}
              </span>
              <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider text-muted">
                gold/hr
              </span>
            </p>
          </div>

          <p className="m-0 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[11px] tabular-nums text-muted">
            <span>{stageName(stats.stageKey, stats.stageWave)}</span>
            {inv && (
              <>
                <span className="opacity-55" aria-hidden>
                  ·
                </span>
                <span>
                  Inv {invValue !== null ? formatMoney(invValue, currency) : "—"}
                  {pricing && <span className="text-muted"> ({pricingLabel})</span>}
                </span>
              </>
            )}
          </p>
        </div>
      )}
    </OverlayFrame>
  );
}
