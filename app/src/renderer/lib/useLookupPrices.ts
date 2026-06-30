import { useMemo, useSyncExternalStore } from "react";
import type { LookupItem, LookupPriceSnapshot, ResolvedLookupPrice } from "../../../shared/types";
import { resolveLookupPrice } from "../../core/lookupPrice";
import { usePriceStatus } from "./usePrices";
import { reportIpcError } from "./reportError";

// App-lifetime singleton: fetch the snapshot once and subscribe to updates, so
// the hundreds of Lookup cards share one IPC fetch + listener instead of each
// fetching. Backed by useSyncExternalStore.
//
// Deviates from RENDERER.md rule #1 ("one IPC listener per channel in
// TbhProvider.tsx") on purpose: the snapshot can hold ~1k entries and is read
// by every Lookup card, so routing it through TbhProvider's context would
// re-render the whole tab tree on every update. A module-level singleton with
// useSyncExternalStore avoids that — same call pattern TbhProvider already
// makes, just outside the context tree.
let snapshot: LookupPriceSnapshot | null = null;
let started = false;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function start(): void {
  if (started) return;
  started = true;
  window.tbh
    .getLookupPrices()
    .then((next) => {
      snapshot = next;
      notify();
    })
    .catch(reportIpcError);
  window.tbh.onLookupPrices((next) => {
    snapshot = next;
    notify();
  });
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  start();
  return () => {
    listeners.delete(onChange);
  };
}

function getSnapshot(): LookupPriceSnapshot | null {
  return snapshot;
}

export interface LookupPrices {
  resolve: (item: LookupItem) => ResolvedLookupPrice;
  /** When the snapshot was generated, for "updated X ago"; null until loaded. */
  generatedUtc: string | null;
}

/** Resolve any Lookup item to a display price in the user's currency. */
export function useLookupPrices(): LookupPrices {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const currency = usePriceStatus()?.currency ?? "USD";

  return useMemo(
    () => ({
      resolve: (item: LookupItem) => resolveLookupPrice(item, snap, currency),
      generatedUtc: snap?.generatedUtc ?? null,
    }),
    [snap, currency],
  );
}
