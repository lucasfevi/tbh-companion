import { useBoxTimers, fmtTimer } from "./lib/useBoxTimers";
import { stageName } from "../core/stages";
import type { BoxTimerCatalogEntry, BoxTimerRow } from "../../shared/types";

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
  const ids = catalog.filter((e) => e.level != null && levels.includes(e.level)).map((e) => e.boxId);
  void window.tbh.setBoxTrackerBoxes(ids);
}

function trackLevelsSummary(catalog: BoxTimerCatalogEntry[]): string {
  const levels = catalog.filter((e) => e.enabled).map((e) => e.level);
  if (levels.length === 0) return "None";
  if (levels.length <= 5) return levels.map((l) => `Lv${l}`).join(", ");
  return `${levels.length} levels`;
}

function BoxTimerCard({ row }: { row: BoxTimerRow }) {
  const rowClass = [
    "box-row",
    row.status === "cooldown" ? "box-row-cooldown" : "box-row-ready",
    row.atIdealStage ? "box-row-here" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li className={rowClass}>
      <div className="box-row-top">
        <div className="box-row-head">
          <span className="box-name">Lv{row.level ?? "?"}</span>
          <span className="box-lv muted">{row.idealStageLabel}</span>
        </div>
        <span className={`box-status-pill ${row.status}`}>
          {row.status === "cooldown" ? fmtTimer(row.remainingSeconds) : "Ready"}
        </span>
      </div>
      {row.status === "cooldown" ? (
        <>
          <div className="progress-bar compact">
            <div className="progress-fill blue" style={{ width: `${row.progress * 100}%` }} />
          </div>
          <div className="box-row-actions">
            <span className="timer-hint muted small">On cooldown</span>
            <button
              type="button"
              className="btn small-btn ghost-btn"
              onClick={() => void window.tbh.clearBoxTimer(row.boxId)}
            >
              Reset
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          className="btn dropped-btn ready-btn"
          onClick={() => void window.tbh.markBoxDropped(row.boxId)}
        >
          Dropped
        </button>
      )}
    </li>
  );
}

export function BoxTracker() {
  const state = useBoxTimers();

  if (!state) {
    return (
      <div className="box-tracker">
        <p className="muted overlay-msg">Loading…</p>
      </div>
    );
  }

  const currentLabel = stageName(state.currentStageKey);
  const cooldownRows = state.rows.filter((r) => r.status === "cooldown");
  const readyRows = state.rows.filter((r) => r.status === "ready");
  const levelsSummary = trackLevelsSummary(state.catalog);

  return (
    <div className="box-tracker">
      <div className="overlay-bar box-tracker-bar">
        <span className="overlay-title drag-handle">Box tracker</span>
        <div className="overlay-actions no-drag">
          <button type="button" className="icon-btn" title="Open full window" onClick={() => window.tbh.showMain()}>
            {"\u2922"}
          </button>
          <button type="button" className="icon-btn" title="Close" onClick={() => window.tbh.closeBoxTracker()}>
            {"\u2715"}
          </button>
        </div>
      </div>

      <div className="box-tracker-summary no-drag">
        <span className="summary-chip cooldown">{state.cooldownCount} cooling</span>
        <span className="summary-chip ready">{state.readyCount} ready</span>
        <span className="summary-chip muted">Stage: {currentLabel}</span>
      </div>

      <details className="box-level-picker no-drag">
        <summary className="box-level-picker-toggle">
          <span>Track levels</span>
          <span className="box-level-picker-summary muted">{levelsSummary}</span>
        </summary>
        <div className="box-level-picker-body">
          <div className="box-preset-row">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="btn small-btn ghost-btn preset-btn"
                title={p.title}
                onClick={() => applyPreset(p.levels, state.catalog)}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              className="btn small-btn ghost-btn preset-btn"
              onClick={() => void window.tbh.setBoxTrackerBoxes([])}
            >
              Clear
            </button>
          </div>
          <div className="box-level-chips">
            {state.catalog.map((entry) => (
              <button
                key={entry.boxId}
                type="button"
                className={entry.enabled ? "level-chip active" : "level-chip"}
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
        <p className="muted small box-tracker-empty no-drag">
          Expand track levels above to pick boxes and start cooldown timers.
        </p>
      ) : (
        <div className="box-tracker-sections no-drag">
          {cooldownRows.length > 0 && (
            <section className="box-tracker-section">
              <h3 className="box-section-title">On cooldown</h3>
              <ul className="box-tracker-list">
                {cooldownRows.map((row) => (
                  <BoxTimerCard key={row.boxId} row={row} />
                ))}
              </ul>
            </section>
          )}
          {readyRows.length > 0 && (
            <section className="box-tracker-section">
              <h3 className="box-section-title">Ready to mark</h3>
              <ul className="box-tracker-list">
                {readyRows.map((row) => (
                  <BoxTimerCard key={row.boxId} row={row} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {state.disclaimer && <p className="muted small box-tracker-foot no-drag">{state.disclaimer}</p>}
    </div>
  );
}
