import { useRef, useState } from "react";
import { STEAM_CURRENCIES } from "../../core/steamPrice";
import { usePriceProgress, usePriceStatus, usePriceActions } from "../lib/usePrices";
import { reportIpcError } from "../lib/reportError";

function fmtAge(iso: string | null): string {
  if (!iso) return "never";
  const secs = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export function Market() {
  const status = usePriceStatus();
  const progress = usePriceProgress();
  const { setPriceStatus, clearPriceProgress } = usePriceActions();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const mounted = useRef(true);

  async function onCurrencyChange(iso: string) {
    const s = await window.tbh.setCurrency(iso);
    setPriceStatus(s);
    setMessage(null);
    clearPriceProgress();
  }

  async function onRefresh(force: boolean) {
    setBusy(true);
    setMessage(null);
    clearPriceProgress();
    try {
      const res = await window.tbh.refreshPrices(force);
      if (mounted.current) {
        setPriceStatus(res.status);
        setBusy(false);
        clearPriceProgress();
        const stopMsg = res.stopped === "cancelled" ? " (cancelled)" : "";
        setMessage(
          `Priced ${res.priced}, skipped ${res.skipped} fresh, ${res.failed} failed${stopMsg}.`,
        );
      }
    } catch (err) {
      reportIpcError(err);
      if (mounted.current) setBusy(false);
    }
  }

  function onCancel() {
    window.tbh.cancelPrices();
  }

  const pct =
    progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  const cachedCount = status?.count ?? 0;

  return (
    <div className="market">
      <h1>Market prices</h1>
      <p className="muted">
        Steam Community Market prices in your chosen currency. The app refreshes owned items in the
        background and backs off on rate limits until done.
      </p>

      <ul className="tab-tips muted">
        <li>Use when Inventory value columns show dashes or prices look stale.</li>
        <li>Change currency here or in Settings — both stay in sync.</li>
        <li>Force full refresh re-prices everything, ignoring the 24-hour cache.</li>
      </ul>

      {cachedCount === 0 && !busy && (
        <p className="muted empty-hint">
          No prices cached yet. Open Inventory while the game is running, or refresh here once you
          own tradable materials or Legendary+ gear.
        </p>
      )}

      <div className="market-controls">
        <label className="field">
          <span>Currency</span>
          <select
            value={status?.currency ?? "USD"}
            disabled={busy}
            onChange={(e) => void onCurrencyChange(e.target.value)}
          >
            {STEAM_CURRENCIES.map((c) => (
              <option key={c.iso} value={c.iso}>
                {c.iso} - {c.label}
              </option>
            ))}
          </select>
        </label>

        {!busy ? (
          <>
            <button type="button" className="btn primary" onClick={() => void onRefresh(false)}>
              Refresh prices
            </button>
            <button
              type="button"
              className="btn"
              title="Re-price everything, ignoring the 24h cache"
              onClick={() => void onRefresh(true)}
            >
              Force full refresh
            </button>
          </>
        ) : (
          <button type="button" className="btn danger" onClick={onCancel}>
            Stop
          </button>
        )}
      </div>

      <div className="market-status">
        <span>
          <strong>{cachedCount}</strong> prices cached
        </span>
        <span className="muted">currency {status?.currency ?? "-"}</span>
        <span className="muted">updated {fmtAge(status?.fetchedUtc ?? null)}</span>
      </div>

      {busy && (
        <div className="market-progress">
          <div className="bar">
            <div className="bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="muted small">
            {progress
              ? `${progress.done}/${progress.total} - priced ${progress.priced}, failed ${progress.failed} - ${progress.current}`
              : "starting..."}
          </div>
        </div>
      )}

      {message && <p className="market-message">{message}</p>}
    </div>
  );
}
