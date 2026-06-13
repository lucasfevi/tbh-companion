import { useEffect, useMemo, useState, startTransition, type ReactNode } from "react";
import type { Stats, ResolvedInventory, PriceStatus, PriceProgress } from "../../../shared/types";
import { formatPriceRefreshMessage } from "../lib/formatPriceRefreshMessage";
import { reportIpcError } from "../lib/reportError";
import { TbhContext } from "./tbhContext";

export function TbhProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [inventory, setInventory] = useState<ResolvedInventory | null>(null);
  const [priceStatus, setPriceStatus] = useState<PriceStatus | null>(null);
  const [priceProgress, setPriceProgress] = useState<PriceProgress | null>(null);
  const [lastPriceRefreshMessage, setLastPriceRefreshMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    void Promise.all([window.tbh.getStats(), window.tbh.getInventory(), window.tbh.pricesStatus()])
      .then(([s, inv, ps]) => {
        if (!mounted) return;
        if (s) setStats(s);
        if (inv) setInventory(inv);
        setPriceStatus(ps);
      })
      .catch(reportIpcError);

    const offStats = window.tbh.onStats((s) => setStats(s));
    const offInventory = window.tbh.onInventory((inv) => setInventory(inv));
    const offPriceStatus = window.tbh.onPriceStatus((ps) => {
      if (mounted) {
        setPriceStatus(ps);
        if (ps.freshCount === 0) {
          setLastPriceRefreshMessage(null);
        }
      }
    });
    const offProgress = window.tbh.onPricesProgress((p) => {
      if (p.finished) {
        startTransition(() => setPriceProgress(null));
        void window.tbh
          .pricesStatus()
          .then((ps) => {
            if (!mounted) return;
            setPriceStatus(ps);
            if (p.result) {
              setLastPriceRefreshMessage(
                formatPriceRefreshMessage({ ok: true, ...p.result, ownedTargets: ps.ownedTargets }),
              );
            }
          })
          .catch(reportIpcError);
        return;
      }
      startTransition(() => setPriceProgress(p));
      void window.tbh
        .pricesStatus()
        .then((ps) => {
          if (mounted) setPriceStatus(ps);
        })
        .catch(reportIpcError);
    });

    return () => {
      mounted = false;
      offStats();
      offInventory();
      offPriceStatus();
      offProgress();
    };
  }, []);

  const value = useMemo(
    () => ({
      stats,
      inventory,
      priceStatus,
      priceProgress,
      lastPriceRefreshMessage,
      setPriceStatus,
      clearPriceProgress: () => setPriceProgress(null),
      clearLastPriceRefreshMessage: () => setLastPriceRefreshMessage(null),
    }),
    [stats, inventory, priceStatus, priceProgress, lastPriceRefreshMessage],
  );

  return <TbhContext.Provider value={value}>{children}</TbhContext.Provider>;
}
