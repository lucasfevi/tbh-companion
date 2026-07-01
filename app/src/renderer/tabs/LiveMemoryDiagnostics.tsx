import type { ReactNode } from "react";
import { useLiveMemory } from "../lib/useLiveMemory";
import { liveReaderState } from "../../core/liveMemory/status";
import { TabPage } from "../design-system/primitives/TabPage/TabPage";
import { TabHeader } from "../design-system/primitives/TabHeader/TabHeader";

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-1 text-[13px]">
      <span className="text-muted">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

/**
 * Dev-only diagnostics for the live-memory reader: attach state, detected
 * version, cadence source, last read cost, and snapshot age. Gated to dev
 * builds in AppTabBar — not shipped in the production tab bar.
 */
export function LiveMemoryDiagnostics() {
  const { snapshot, status } = useLiveMemory();
  const state = liveReaderState(status, Boolean(status?.running));
  const lastReadAt = snapshot ? new Date(snapshot.at).toLocaleTimeString() : "—";

  return (
    <TabPage>
      <TabHeader
        title="Live memory (debug)"
        intro="Dev-only diagnostics for the read-only live memory reader."
      />
      <div className="max-w-md">
        <Row label="Reader state" value={state} />
        <Row label="Running" value={String(status?.running ?? false)} />
        <Row label="Attached" value={String(status?.attached ?? false)} />
        <Row label="PID" value={status?.pid ?? "—"} />
        <Row label="Game version" value={status?.gameVersion ?? "—"} />
        <Row label="Supported" value={String(status?.supported ?? false)} />
        {status?.note ? <Row label="Note" value={status.note} /> : null}
        <Row label="Source" value={snapshot?.source ?? "—"} />
        <Row label="Stage key" value={snapshot?.stageKey ?? "—"} />
        <Row label="Stage wave" value={snapshot?.stageWave ?? "—"} />
        <Row label="Last read (ms)" value={snapshot?.readMs ?? "—"} />
        <Row label="Last read at" value={lastReadAt} />
      </div>
    </TabPage>
  );
}
