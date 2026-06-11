import { useBoxTimers, fmtTimer } from "./lib/useBoxTimers";
import { stageName } from "../core/stages";
import type { BoxTimerCatalogEntry, BoxTimerRow } from "../../shared/types";
import { Button } from "./components/ui/Button";
import { Badge } from "./components/ui/Badge";
import { CapacityBar } from "./components/ui/CapacityBar";
import { IconButton } from "./components/ui/IconButton";
import { OverlayFrame } from "./components/ui/OverlayFrame";
import { cn } from "./lib/cn";

const PRESETS: { label: string; title: string; levels: number[] }[] = [
  { label: "Starter", title: "Lv 1–7 (Act 1 bosses)", levels: [1, 2, 3, 4, 5, 6, 7] },
  { label: "Mid", title: "Lv 15–30", levels: [15, 20, 30] },
  { label: "Late", title: "Lv 40–80", levels: [40, 50, 65, 80] },
];

function enabledIds(catalog: BoxTimerCatalogEntry[]): number[] {
  return catalog.filter((e) => e.enabled).map((e) => e.boxId);
}

function toggleLevel(entry: BoxTimerCatalogEntry, catalog: BoxTimerCatalogEntry[]): void {
  const current = enabledIds(catalog);
  if (entry.enabled) {
    void window.tbh.setBoxTrackerBoxes(current.filter((id) => id !== entry.boxId));
  } else {
    void window.tbh.setBoxTrackerBoxes([...current, entry.boxId]);
  }
}

function applyPreset(levels: number[], catalog: BoxTimerCatalogEntry[]): void {
  const ids = catalog
    .filter((e) => e.level != null && levels.includes(e.level))
    .map((e) => e.boxId);
  void window.tbh.setBoxTrackerBoxes(ids);
}

function trackLevelsSummary(catalog: BoxTimerCatalogEntry[]): string {
  const levels = catalog.filter((e) => e.enabled).map((e) => e.level);
  if (levels.length === 0) return "None";
  if (levels.length <= 5) return levels.map((l) => `Lv${l}`).join(", ");
  return `${levels.length} levels`;
}

function BoxTimerCard({ row }: { row: BoxTimerRow }) {
  return (
    <li
      className={cn(
        "rounded-lg border border-border border-l-[3px] bg-card px-2.5 py-2",
        row.status === "cooldown" && "border-l-[#5a9fd1]",
        row.status === "ready" && "border-l-[#6fcf97]",
        row.atIdealStage && "shadow-[inset_0_0_0_1px_rgba(74,163,255,0.25)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 justify-between gap-2 text-xs">
          <span className="font-semibold">Lv{row.level ?? "?"}</span>
          <span className="text-muted">{row.idealStageLabel}</span>
        </div>
        <Badge
          variant={row.status === "ready" ? "statusReady" : "statusCooldown"}
          className="shrink-0"
        >
          {row.status === "cooldown" ? fmtTimer(row.remainingSeconds) : "Ready"}
        </Badge>
      </div>
      {row.status === "cooldown" ? (
        <>
          <CapacityBar percent={row.progress * 100} variant="blue" compact className="mt-1" />
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="flex-1 text-xs text-muted">On cooldown</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void window.tbh.clearBoxTimer(row.boxId)}
            >
              Reset
            </Button>
          </div>
        </>
      ) : (
        <Button
          variant="success"
          className="mt-1 w-full"
          onClick={() => void window.tbh.markBoxDropped(row.boxId)}
        >
          Dropped
        </Button>
      )}
    </li>
  );
}

export function BoxTracker() {
  const state = useBoxTimers();

  if (!state) {
    return (
      <OverlayFrame>
        <p className="m-0 text-muted">Loading…</p>
      </OverlayFrame>
    );
  }

  const currentLabel = stageName(state.currentStageKey);
  const cooldownRows = state.rows.filter((r) => r.status === "cooldown");
  const readyRows = state.rows.filter((r) => r.status === "ready");
  const levelsSummary = trackLevelsSummary(state.catalog);

  return (
    <OverlayFrame>
      <div className="flex shrink-0 items-center justify-between">
        <span className="drag-handle whitespace-nowrap text-[10px] font-bold tracking-wide text-muted">
          Stage chest tracker
        </span>
        <div className="no-drag flex gap-1">
          <IconButton type="button" title="Open full window" onClick={() => window.tbh.showMain()}>
            {"\u2922"}
          </IconButton>
          <IconButton type="button" title="Close" onClick={() => window.tbh.closeBoxTracker()}>
            {"\u2715"}
          </IconButton>
        </div>
      </div>

      <div className="no-drag flex flex-wrap gap-1.5">
        <Badge variant="info">{state.cooldownCount} cooling</Badge>
        <Badge variant="success">{state.readyCount} ready</Badge>
        <Badge variant="muted">Stage: {currentLabel}</Badge>
      </div>

      <details className="no-drag shrink-0 overflow-hidden rounded-lg border border-border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2 py-1.5 text-[11px] font-semibold [&::-webkit-details-marker]:hidden">
          <span>Track levels</span>
          <span className="min-w-0 truncate text-right text-[10px] font-medium text-muted">
            {levelsSummary}
          </span>
        </summary>
        <div className="flex flex-col gap-1.5 border-t border-border px-2 py-1.5 pb-2">
          <div className="flex flex-wrap gap-1">
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                size="sm"
                variant="ghost"
                title={p.title}
                onClick={() => applyPreset(p.levels, state.catalog)}
              >
                {p.label}
              </Button>
            ))}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void window.tbh.setBoxTrackerBoxes([])}
            >
              Clear
            </Button>
          </div>
          <div className="flex max-h-[88px] flex-wrap gap-1 overflow-y-auto">
            {state.catalog.map((entry) => (
              <button
                key={entry.boxId}
                type="button"
                className={cn(
                  "cursor-pointer rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                  entry.enabled
                    ? "border-accent bg-[rgba(74,163,255,0.15)] text-accent"
                    : "border-border bg-card text-muted hover:border-muted hover:text-fg",
                )}
                title={`${entry.idealStageLabel}${entry.enabled ? " — tracking" : " — tap to track"}`}
                onClick={() => toggleLevel(entry, state.catalog)}
              >
                Lv{entry.level}
              </button>
            ))}
          </div>
        </div>
      </details>

      {state.rows.length === 0 ? (
        <p className="no-drag m-0 py-2 text-center text-xs text-muted">
          Expand track levels above to pick boxes and start cooldown timers.
        </p>
      ) : (
        <div className="no-drag flex min-h-0 flex-1 flex-col gap-2.5 overflow-auto">
          {cooldownRows.length > 0 && (
            <section className="flex flex-col gap-1.5">
              <h3 className="m-0 text-[11px] font-bold uppercase tracking-wide text-muted">
                On cooldown
              </h3>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {cooldownRows.map((row) => (
                  <BoxTimerCard key={row.boxId} row={row} />
                ))}
              </ul>
            </section>
          )}
          {readyRows.length > 0 && (
            <section className="flex flex-col gap-1.5">
              <h3 className="m-0 text-[11px] font-bold uppercase tracking-wide text-muted">
                Ready to mark
              </h3>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {readyRows.map((row) => (
                  <BoxTimerCard key={row.boxId} row={row} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </OverlayFrame>
  );
}
