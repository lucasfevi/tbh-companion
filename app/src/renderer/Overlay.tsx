import { useStats } from "./lib/useStats";
import { useInventory } from "./lib/useInventory";
import { usePriceStatus } from "./lib/usePrices";
import { fmtCompact, fmtAgo } from "./lib/format";
import { formatMoney } from "../core/steamPrice";
import { stageName } from "../core/stages";

const IDLE_THRESHOLD = 120;

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

  const currency = inv?.currency ?? priceStatus?.currency ?? "USD";
  const invValue = inv?.composition.valuedTotal ?? null;
  const pricing = priceStatus?.running ?? false;

  const idle = stats !== null && stats.secondsSinceGain !== null && stats.secondsSinceGain > IDLE_THRESHOLD;

  return (
    <div className="overlay">
      <div className="overlay-bar">
        <span className="overlay-title">TBH</span>
        <div className="overlay-actions no-drag">
          <button type="button" title="Reset session stats" onClick={() => window.tbh.reset()}>
            {"\u21bb"}
          </button>
          <button type="button" title="Open full window" onClick={() => window.tbh.showMain()}>
            {"\u2922"}
          </button>
          <button type="button" title="Close overlay" onClick={() => window.tbh.closeOverlay()}>
            {"\u2715"}
          </button>
        </div>
      </div>

      {!stats ? (
        <p className="muted overlay-msg">Connecting...</p>
      ) : (
        <div className="overlay-readout">
          <div className="overlay-metrics">
            <p className="overlay-metric overlay-metric--xp" title={RATE_TIP}>
              <span className="overlay-metric-val">{fmtCompact(stats.rollingRate)}</span>
              <span className="overlay-metric-unit">XP/hr</span>
            </p>
            <p className="overlay-metric overlay-metric--gold" title={GOLD_TIP}>
              <span className="overlay-metric-val">{fmtCompact(stats.goldRate)}</span>
              <span className="overlay-metric-unit">gold/hr</span>
            </p>
          </div>

          <p className="overlay-detail">
            <span>{stageName(stats.stageKey, stats.stageWave)}</span>
            <span className="overlay-sep" aria-hidden>
              ·
            </span>
            <span className={idle ? "warn" : undefined}>XP + {fmtAgo(stats.secondsSinceGain)}</span>
            {inv && (
              <>
                <span className="overlay-sep" aria-hidden>
                  ·
                </span>
                <span>
                  Inv {invValue !== null ? formatMoney(invValue, currency) : "—"}
                  {pricing && <span className="muted"> (pricing…)</span>}
                </span>
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
