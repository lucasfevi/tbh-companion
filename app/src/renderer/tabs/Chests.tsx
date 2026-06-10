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

function ChestCategoryCard({
  title,
  slot,
  breakdown,
  fillClass,
}: {
  title: string;
  slot: BoxSlotStatus;
  breakdown: ChestCapacityBreakdown;
  fillClass: "gray" | "blue" | "red";
}) {
  const pct = slot.capacity > 0 ? Math.min(100, (slot.quantity / slot.capacity) * 100) : 0;

  return (
    <article className="chest-card">
      <div className="chest-card-head">
        <h2>{title}</h2>
        {slot.isFull && <span className="badge full">Full</span>}
      </div>
      <p className="chest-card-count">
        {slot.quantity} / {slot.capacity}
      </p>
      <div
        className="progress-bar compact"
        role="progressbar"
        aria-valuenow={slot.quantity}
        aria-valuemin={0}
        aria-valuemax={slot.capacity}
      >
        <div className={`progress-fill ${fillClass}`} style={{ width: `${pct}%` }} />
      </div>
      {!slot.isFull && (
        <p className="muted small chest-card-remaining">{slot.slotsRemaining} slot(s) left</p>
      )}
      <details className="chest-card-details">
        <summary className="muted small">Capacity details</summary>
        <p className="muted small">{capacityParts(breakdown).join(", ")}</p>
      </details>
    </article>
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

  const { common, stageBoss, actBoss, totalHeld } = chests;

  return (
    <div className="chests-tab">
      <header className="chests-header">
        <h1>Chests</h1>
        <p className="muted">
          {totalHeld.toLocaleString()} unopened chest slots from your save. Common and stage boss
          chests share an open cooldown. Stage boss chest drops use a 12-minute window — open the
          Stage chest tracker below.
        </p>
        <div className="chests-header-actions">
          <button type="button" className="btn primary" onClick={() => window.tbh.openBoxTracker()}>
            Open Stage chest tracker
          </button>
        </div>
      </header>

      <div className="chest-grid">
        <ChestCategoryCard
          title="Common"
          slot={common}
          breakdown={chests.capacity.common}
          fillClass="gray"
        />
        <ChestCategoryCard
          title="Stage boss"
          slot={stageBoss}
          breakdown={chests.capacity.stageBoss}
          fillClass="blue"
        />
        <ChestCategoryCard
          title="Act boss"
          slot={actBoss}
          breakdown={chests.capacity.actBoss}
          fillClass="red"
        />
      </div>
    </div>
  );
}
