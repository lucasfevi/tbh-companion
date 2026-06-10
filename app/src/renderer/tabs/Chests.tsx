import { useChests } from "../lib/useChests";
import type { BoxSlotStatus, ChestCapacityBreakdown } from "../../../shared/types";

function capacityParts(breakdown: ChestCapacityBreakdown): string[] {
  const parts = [`${breakdown.base} base`];
  if (breakdown.runeBonus > 0) {
    parts.push(
      `+${breakdown.runeBonus} from ${breakdown.purchasedCapRuneNodes} ${breakdown.runeLabel} node(s)`,
    );
  }
  return parts;
}

function ChestCategorySection({
  title,
  slot,
  breakdown,
  fillClass,
  remainingLabel,
}: {
  title: string;
  slot: BoxSlotStatus;
  breakdown: ChestCapacityBreakdown;
  fillClass: "gray" | "blue" | "red";
  remainingLabel: string;
}) {
  const pct = slot.capacity > 0 ? Math.min(100, (slot.quantity / slot.capacity) * 100) : 0;

  return (
    <section className="chest-section">
      <div className="chest-section-head">
        <h2>{title}</h2>
        {slot.isFull && <span className="badge full">Full</span>}
      </div>
      <div className="chest-cap-row">
        <span className="chest-cap-label">
          {slot.quantity} / {slot.capacity}
        </span>
      </div>
      <p className="muted small">Capacity from save: {capacityParts(breakdown).join(", ")}</p>
      <div
        className="progress-bar"
        role="progressbar"
        aria-valuenow={slot.quantity}
        aria-valuemin={0}
        aria-valuemax={slot.capacity}
      >
        <div className={`progress-fill ${fillClass}`} style={{ width: `${pct}%` }} />
      </div>
      {!slot.isFull && (
        <p className="muted small">
          {slot.slotsRemaining} slot(s) remaining before {remainingLabel}
        </p>
      )}
    </section>
  );
}

export function Chests() {
  const chests = useChests();

  if (!chests) {
    return (
      <div className="placeholder">
        <h1>Chests</h1>
        <p className="muted">Waiting for save data…</p>
      </div>
    );
  }

  const { common, stageBoss, actBoss, totalHeld, capacity } = chests;

  return (
    <div className="chests-tab">
      <header className="chests-header">
        <h1>Chests</h1>
        <p className="muted">
          Unopened chest slots from your save ({totalHeld.toLocaleString()} held across all types).
          Common and stage boss chests share an open cooldown — many players stockpile commons until
          full.
        </p>
        <p className="muted small">
          {capacity.totalRunePurchases} rune node(s) purchased in RuneSaveData.
        </p>
      </header>

      <ChestCategorySection
        title="Common (gray)"
        slot={common}
        breakdown={capacity.common}
        fillClass="gray"
        remainingLabel="common cap"
      />

      <ChestCategorySection
        title="Stage boss (blue)"
        slot={stageBoss}
        breakdown={capacity.stageBoss}
        fillClass="blue"
        remainingLabel="stage boss cap"
      />

      <ChestCategorySection
        title="Act boss (red)"
        slot={actBoss}
        breakdown={capacity.actBoss}
        fillClass="red"
        remainingLabel="act boss cap"
      />

      <section className="chest-actions">
        <button type="button" className="btn primary" onClick={() => window.tbh.openBoxTracker()}>
          Open box tracker overlay
        </button>
        <p className="muted small">
          Track rare boss box drops with 12-minute timers and community ideal-stage routes.
        </p>
      </section>
    </div>
  );
}
