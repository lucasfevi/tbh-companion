import { useEffect, useRef, useState } from "react";
import { STEAM_CURRENCIES } from "../../core/steamPrice";
import type { PriceProgress, PriceStatus } from "../../../shared/types";

function fmtAge(iso: string | null): string {
  if (!iso) return "never";
  const secs = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export function Market() {
  const [status, setStatus] = useState<PriceStatus | null>(null);
  const [progress, setProgress] = useState<PriceProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    void window.tbh.pricesStatus().then((s) => mounted.current && setStatus(s));
    const off = window.tbh.onPricesProgress((p) => mounted.current && setProgress(p));
    return () => {
      mounted.current = false;
      off();
    };
  }, []);

  async function onCurrencyChange(iso: string) {
    const s = await window.tbh.setCurrency(iso);
    setStatus(s);
    setMessage(null);
    setProgress(null);
  }

  async function onRefresh(force: boolean) {
    setBusy(true);
    setMessage(null);
    setProgress(null);
    const res = await window.tbh.refreshPrices(force);
    if (mounted.current) {
      setStatus(res.status);
      setBusy(false);
      setProgress(null);
      const stopMsg =
        res.stopped === "cancelled"
          ? " (cancelled)"
          : "";
      setMessage(`Priced ${res.priced}, skipped ${res.skipped} fresh, ${res.failed} failed${stopMsg}.`);
    }
  }

  function onCancel() {
    window.tbh.cancelPrices();
  }

  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="market">
      <h1>Market prices</h1>
      <p className="muted">
        Prices come from the Steam Community Market (<code>priceoverview</code>) in your chosen
        currency. The app automatically refreshes prices for items you own (materials + Legendary+
        gear) in the background, backing off on rate limits until done. Manual refresh re-prices
        stale entries (skips items priced in the last 24h unless forced).
      </p>

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
            <button className="btn primary" onClick={() => void onRefresh(false)}>
              Refresh prices
            </button>
            <button className="btn" title="Re-price everything, ignoring the 24h cache" onClick={() => void onRefresh(true)}>
              Force full refresh
            </button>
          </>
        ) : (
          <button className="btn danger" onClick={onCancel}>
            Stop
          </button>
        )}
      </div>

      <div className="market-status">
        <span>
          <strong>{status?.count ?? 0}</strong> prices cached
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
