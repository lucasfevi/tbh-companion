import { useRef, useState } from "react";
import { STEAM_CURRENCIES } from "../../core/steamPrice";
import { usePriceProgress, usePriceStatus, usePriceActions } from "../lib/usePrices";
import { reportIpcError } from "../lib/reportError";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Select } from "../components/ui/Select";
import { TabHeader } from "../components/ui/TabHeader";
import { TabPage } from "../components/ui/TabPage";

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
    <TabPage>
      <TabHeader
        title="Market prices"
        intro="Steam Community Market prices in your chosen currency. Prices refresh in the background; the app waits if Steam rate-limits requests."
      />

      <div className="flex flex-col gap-3.5">
        <ul className="m-0 list-disc pl-[18px] text-muted [&>li]:mb-1">
          <li>Use when Inventory value columns show dashes or prices look stale.</li>
          <li>Change currency here or in Settings — both stay in sync.</li>
          <li>Force full refresh re-prices everything, ignoring the 24-hour cache.</li>
        </ul>

        {cachedCount === 0 && !busy && (
          <p className="m-0 rounded-lg border border-border bg-card px-3 py-2.5 text-muted">
            No prices cached yet. Open Inventory while the game is running, or refresh here once you
            own tradable materials or Legendary+ gear.
          </p>
        )}

        <div className="flex flex-wrap items-end gap-2.5">
          <Field label="Currency">
            <Select
              value={status?.currency ?? "USD"}
              disabled={busy}
              onChange={(e) => void onCurrencyChange(e.target.value)}
            >
              {STEAM_CURRENCIES.map((c) => (
                <option key={c.iso} value={c.iso}>
                  {c.iso} - {c.label}
                </option>
              ))}
            </Select>
          </Field>

          {!busy ? (
            <>
              <Button variant="primary" onClick={() => void onRefresh(false)}>
                Refresh prices
              </Button>
              <Button
                title="Re-price everything, ignoring the 24h cache"
                onClick={() => void onRefresh(true)}
              >
                Force full refresh
              </Button>
            </>
          ) : (
            <Button variant="danger" onClick={onCancel}>
              Stop
            </Button>
          )}
        </div>

        <div className="flex items-baseline gap-4 text-[13px]">
          <span>
            <strong>{cachedCount}</strong> prices cached
          </span>
          <span className="text-muted">currency {status?.currency ?? "-"}</span>
          <span className="text-muted">updated {fmtAge(status?.fetchedUtc ?? null)}</span>
        </div>

        {busy && (
          <ProgressBar
            percent={pct}
            label={
              <span className="text-xs text-muted">
                {progress
                  ? `${progress.done}/${progress.total} - priced ${progress.priced}, failed ${progress.failed} - ${progress.current}`
                  : "starting..."}
              </span>
            }
          />
        )}

        {message && <p className="m-0 text-[13px]">{message}</p>}
      </div>
    </TabPage>
  );
}
