import type { ReactNode } from "react";
import { useLiveMemory } from "../lib/useLiveMemory";
import { useStats } from "../lib/useStats";
import { liveReaderState } from "../../core/liveMemory/status";
import { heroName } from "../../core/heroes";
import { fmtCompact } from "../lib/format";
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

function StatHealth({ label, value }: { label: string; value: unknown }) {
  const ok = value !== null && value !== undefined;
  return (
    <div className="flex justify-between gap-4 border-b border-border py-1 text-[13px]">
      <span className="text-muted">{label}</span>
      <span className={ok ? "text-accent tabular-nums" : "text-gold tabular-nums"}>
        {ok ? "✓ live" : "— fallback"}
      </span>
    </div>
  );
}

/**
 * Dev-only diagnostics for the live-memory reader: attach state, detected
 * version, cadence source, last read cost, snapshot age, and per-stat health.
 * Gated to dev builds in AppTabBar — not shipped in the production tab bar.
 */
export function LiveMemoryDiagnostics() {
  const { snapshot, status } = useLiveMemory();
  const stats = useStats();
  const state = liveReaderState(status, Boolean(status?.running));
  const lastReadAt = snapshot ? new Date(snapshot.at).toLocaleTimeString() : "—";

  return (
    <TabPage>
      <TabHeader
        title="Live memory (debug)"
        intro="Dev-only diagnostics for the read-only live memory reader."
      />
      <div className="max-w-md space-y-4">
        <section>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">Reader</p>
          <Row label="Reader state" value={state} />
          <Row label="Running" value={String(status?.running ?? false)} />
          <Row label="Attached" value={String(status?.attached ?? false)} />
          <Row label="PID" value={status?.pid ?? "—"} />
          <Row label="Game version" value={status?.gameVersion ?? "—"} />
          <Row label="Supported" value={String(status?.supported ?? false)} />
          {status?.note ? <Row label="Note" value={status.note} /> : null}
          <Row label="Source" value={snapshot?.source ?? "—"} />
          <Row label="Last read (ms)" value={snapshot?.readMs ?? "—"} />
          <Row label="Last read at" value={lastReadAt} />
        </section>

        <section>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">
            Live values
          </p>
          <StatHealth label="Gold" value={snapshot?.gold} />
          <Row
            label="Current gold"
            value={snapshot?.gold != null ? fmtCompact(snapshot.gold) : "—"}
          />
          {stats ? (
            <>
              <Row label="Tracker XP/hr" value={`${fmtCompact(stats.rollingRate)}/hr`} />
              <Row label="Tracker gold/hr" value={`${fmtCompact(stats.goldRate)}/hr`} />
              <Row label="Session XP" value={fmtCompact(stats.cumulativeGained)} />
              <Row label="Session XP/hr" value={`${fmtCompact(stats.sessionRate)}/hr`} />
            </>
          ) : null}
        </section>

        <section>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">
            Heroes (live exp)
          </p>
          <StatHealth
            label="Heroes"
            value={snapshot?.heroes?.length ? snapshot.heroes.length : null}
          />
          {snapshot?.heroes && snapshot.heroes.length > 0 ? (
            <div className="mt-1 space-y-0">
              {snapshot.heroes.map((h) => (
                <Row
                  key={h.heroKey}
                  label={`${heroName(String(h.heroKey))} (Lv ${h.level})`}
                  value={fmtCompact(h.exp)}
                />
              ))}
            </div>
          ) : (
            <Row label="Party" value="—" />
          )}
        </section>

        <section>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">
            Per-stat health
          </p>
          <Row label="Stage key" value={snapshot?.stageKey ?? "—"} />
          <Row label="Stage wave" value={snapshot?.stageWave ?? "—"} />
          <StatHealth label="Box count" value={snapshot?.boxCount} />
          <Row label="Box count (raw)" value={snapshot?.boxCount ?? "—"} />
          <StatHealth
            label="Inventory"
            value={snapshot?.inventoryItems?.length ? snapshot.inventoryItems.length : null}
          />
          <Row
            label="Inventory items"
            value={snapshot?.inventoryItems != null ? String(snapshot.inventoryItems.length) : "—"}
          />
          <StatHealth
            label="Pets"
            value={snapshot?.petData?.length ? snapshot.petData.length : null}
          />
          <Row
            label="Pets count"
            value={snapshot?.petData != null ? String(snapshot.petData.length) : "—"}
          />
        </section>
      </div>
    </TabPage>
  );
}
