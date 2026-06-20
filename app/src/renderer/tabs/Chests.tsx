import { useChests } from "../lib/useChests";
import type { BoxSlotStatus, ChestCapacityBreakdown } from "../../../shared/types";
import { Badge } from "../components/ui/Badge";
import { CapacityBar } from "../components/ui/CapacityBar";
import { Accordion } from "../design-system/primitives/Accordion/Accordion";
import { Card } from "../components/ui/Card";
import { TabHeader } from "../components/ui/TabHeader";
import { TabPage } from "../components/ui/TabPage";
import { ChestsTrackerPanel } from "../components/ChestsTrackerPanel";

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
    <Card className="flex h-full flex-col">
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
      <p className="m-0 mt-1.5 min-h-[1.125rem] text-xs text-muted">
        {!slot.isFull ? `${slot.slotsRemaining} slot(s) left` : "\u00a0"}
      </p>
      <Accordion variant="card" title="Capacity details" className="mt-auto pt-2">
        <p className="m-0 text-xs text-muted">{capacityParts(breakdown).join(", ")}</p>
      </Accordion>
    </Card>
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
        intro={`${totalHeld.toLocaleString()} unopened chest slots from your save.`}
      />

      <section aria-labelledby="chest-slots-heading" className="flex flex-col gap-2">
        <h2 id="chest-slots-heading" className="m-0 text-sm font-semibold">
          Chest slots
        </h2>
        <div className="grid grid-cols-3 items-stretch gap-2.5 max-[720px]:grid-cols-1">
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
      </section>

      <ChestsTrackerPanel />
    </TabPage>
  );
}
