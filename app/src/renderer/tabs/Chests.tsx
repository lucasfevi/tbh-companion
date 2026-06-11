import { useChests } from "../lib/useChests";
import type { BoxSlotStatus, ChestCapacityBreakdown } from "../../../shared/types";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { CapacityBar } from "../components/ui/CapacityBar";
import { TabHeader } from "../components/ui/TabHeader";
import { TabPage } from "../components/ui/TabPage";

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
  fillVariant,
}: {
  title: string;
  slot: BoxSlotStatus;
  breakdown: ChestCapacityBreakdown;
  fillVariant: "gray" | "blue" | "red";
}) {
  const pct = slot.capacity > 0 ? Math.min(100, (slot.quantity / slot.capacity) * 100) : 0;

  return (
    <article className="rounded-lg border border-border bg-card p-3">
      <div className="mb-1 flex items-center gap-2">
        <h2 className="m-0 text-sm">{title}</h2>
        {slot.isFull ? <Badge>Full</Badge> : null}
      </div>
      <p className="mb-1.5 mt-0 text-lg font-semibold">
        {slot.quantity} / {slot.capacity}
      </p>
      <CapacityBar
        percent={pct}
        variant={fillVariant}
        compact
        role="progressbar"
        aria-valuenow={slot.quantity}
        aria-valuemin={0}
        aria-valuemax={slot.capacity}
      />
      {!slot.isFull && (
        <p className="mt-1.5 text-xs text-muted">{slot.slotsRemaining} slot(s) left</p>
      )}
      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-muted">Capacity details</summary>
        <p className="text-xs text-muted">{capacityParts(breakdown).join(", ")}</p>
      </details>
    </article>
  );
}

export function Chests() {
  const chests = useChests();

  if (!chests) {
    return (
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-lg font-semibold">Chests</h1>
        <p className="m-0 text-muted">Waiting for save data…</p>
      </div>
    );
  }

  const { common, stageBoss, actBoss, totalHeld } = chests;

  return (
    <TabPage>
      <TabHeader
        title="Chests"
        intro={`${totalHeld.toLocaleString()} unopened chest slots from your save. Common and stage boss chests share an open cooldown. Stage boss drops are timed — use the Stage chest tracker below.`}
      >
        <div className="mt-2 flex flex-col items-start gap-1.5">
          <Button variant="primary" onClick={() => window.tbh.openBoxTracker()}>
            Open Stage chest tracker
          </Button>
        </div>
      </TabHeader>

      <div className="grid grid-cols-3 gap-2.5 max-[720px]:grid-cols-1">
        <ChestCategoryCard
          title="Common"
          slot={common}
          breakdown={chests.capacity.common}
          fillVariant="gray"
        />
        <ChestCategoryCard
          title="Stage boss"
          slot={stageBoss}
          breakdown={chests.capacity.stageBoss}
          fillVariant="blue"
        />
        <ChestCategoryCard
          title="Act boss"
          slot={actBoss}
          breakdown={chests.capacity.actBoss}
          fillVariant="red"
        />
      </div>
    </TabPage>
  );
}
