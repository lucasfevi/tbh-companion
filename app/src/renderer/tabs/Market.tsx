import { useState } from "react";
import { STEAM_CURRENCIES } from "../../core/steamPrice";
import { useLastPriceRefreshMessage, usePriceStatus, usePriceActions } from "../lib/usePrices";
import { formatPriceRefreshMessage } from "../lib/formatPriceRefreshMessage";
import { reportIpcError } from "../lib/reportError";
import { SteamPriceProgress } from "../components/market/SteamPriceProgress";
import { Button } from "../design-system/primitives/Button/Button";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { Select } from "../design-system/primitives/Select/Select";
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

function formatStatusLine(status: NonNullable<ReturnType<typeof usePriceStatus>>): string {
  const { ownedTargets, freshCount, staleCount } = status;
  if (ownedTargets === 0) {
    return "No priceable items in inventory yet";
  }
  const stalePart = staleCount > 0 ? ` · ${staleCount} need update` : "";
  return `${freshCount} of ${ownedTargets} items priced${stalePart}`;
}

export function Market() {
  const status = usePriceStatus();
  const lastMessage = useLastPriceRefreshMessage();
  const { setPriceStatus, clearPriceProgress, clearLastPriceRefreshMessage } = usePriceActions();
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const running = status?.running ?? false;

  const message = localMessage ?? lastMessage;

  async function onCurrencyChange(iso: string) {
    const s = await window.tbh.setCurrency(iso);
    setPriceStatus(s);
    setLocalMessage(null);
    clearLastPriceRefreshMessage();
    clearPriceProgress();
  }

  async function onRefresh(force: boolean) {
    setLocalMessage(null);
    clearLastPriceRefreshMessage();
    clearPriceProgress();
    try {
      const res = await window.tbh.refreshPrices(force);
      if (res.queued || res.noop || !res.ok) {
        setPriceStatus(res.status);
        setLocalMessage(
          formatPriceRefreshMessage({
            ...res,
            ownedTargets: res.status.ownedTargets,
          }),
        );
      } else {
        setPriceStatus(res.status);
      }
    } catch (err) {
      reportIpcError(err, "market-refresh");
      setLocalMessage("Refresh failed — check your connection and try again.");
    }
  }

  const ownedTargets = status?.ownedTargets ?? 0;
  const showEmptyHint = ownedTargets === 0 && !running;

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

        {showEmptyHint && (
          <Card padding="compact" className="text-muted">
            No prices cached yet. Open Inventory while the game is running, or refresh here once you
            own tradable materials or Legendary+ gear.
          </Card>
        )}

        <div className="flex flex-wrap items-end gap-2.5">
          <Field label="Currency">
            <Select
              value={status?.currency ?? "USD"}
              disabled={running}
              onValueChange={(value) => void onCurrencyChange(String(value))}
              options={STEAM_CURRENCIES.map((c) => ({
                value: c.iso,
                label: `${c.iso} - ${c.label}`,
              }))}
            />
          </Field>

          {!running ? (
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
          ) : null}
        </div>

        <div className="flex items-baseline gap-4 text-[13px]">
          <span>{status ? formatStatusLine(status) : "—"}</span>
          <span className="text-muted">currency {status?.currency ?? "-"}</span>
          <span className="text-muted">updated {fmtAge(status?.fetchedUtc ?? null)}</span>
        </div>

        <SteamPriceProgress variant="full" />

        {message && <p className="m-0 text-[13px]">{message}</p>}
      </div>
    </TabPage>
  );
}
