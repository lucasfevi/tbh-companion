import { useEffect, useState } from "react";
import { useStats } from "./lib/useStats";
import { useInventory } from "./lib/useInventory";
import { fmtCompact, fmtAgo } from "./lib/format";
import { formatMoney } from "../core/steamPrice";
import { stageName } from "../core/stages";
import type { PriceStatus } from "../../shared/types";

const IDLE_THRESHOLD = 120;

export function Overlay() {
  const stats = useStats();
  const inv = useInventory();
  const [priceStatus, setPriceStatus] = useState<PriceStatus | null>(null);

  useEffect(() => {
    void window.tbh.pricesStatus().then(setPriceStatus).catch(() => {});
    const off = window.tbh.onPricesProgress(() => {
      void window.tbh.pricesStatus().then(setPriceStatus).catch(() => {});
    });
    return off;
  }, []);

  const currency = inv?.currency ?? priceStatus?.currency ?? "USD";
  const invValue = inv?.composition.valuedTotal ?? null;
  const pricing = priceStatus?.running ?? false;

  return (
    <div className="overlay">
      <div className="overlay-bar">
        <span className="overlay-title">TBH</span>
        <div className="overlay-actions no-drag">
          <button title="Reset" onClick={() => window.tbh.reset()}>
            {"\u21bb"}
          </button>
          <button title="Open full window" onClick={() => window.tbh.showMain()}>
            {"\u2922"}
          </button>
          <button title="Close overlay" onClick={() => window.tbh.closeOverlay()}>
            {"\u2715"}
          </button>
        </div>
      </div>

      {!stats ? (
        <p className="muted overlay-msg">Connecting...</p>
      ) : (
        <>
          <div className="overlay-rate">
            <span className="overlay-num">{fmtCompact(stats.rollingRate)}</span>
            <span className="overlay-unit">XP / hr</span>
          </div>
          <div className="overlay-gold">{fmtCompact(stats.goldRate)} gold / hr</div>
          {inv && (
            <div className="overlay-inv">
              Inv: {invValue !== null ? formatMoney(invValue, currency) : "-"}
              {pricing && <span className="muted"> (pricing…)</span>}
            </div>
          )}
          <div className="overlay-foot">
            <span>{stageName(stats.stageKey, stats.stageWave)}</span>
            <span
              className={
                stats.secondsSinceGain !== null && stats.secondsSinceGain > IDLE_THRESHOLD
                  ? "warn"
                  : ""
              }
            >
              {fmtAgo(stats.secondsSinceGain)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
