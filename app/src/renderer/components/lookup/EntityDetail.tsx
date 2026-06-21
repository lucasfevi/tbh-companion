import { Card } from "../../design-system/primitives/Card/Card";
import { ItemDetailCard } from "./ItemDetailCard";
import { NavChip } from "./NavChip";
import type { LookupItem, LookupSources } from "../../../../shared/types";
import type { LookupNavNode } from "../../lib/useLookupNav";

/** Renders the active Lookup-tab node: an item, a box, or a stage. */
export function EntityDetail({
  node,
  itemIndex,
  sources,
  labelFor,
  onNavigate,
}: {
  node: LookupNavNode;
  itemIndex: Map<number, LookupItem>;
  sources: LookupSources;
  labelFor: (node: LookupNavNode) => string;
  onNavigate: (node: LookupNavNode) => void;
}) {
  if (node.type === "item") {
    const item = itemIndex.get(node.id);
    if (!item) return <p className="m-0 text-xs text-muted">Item not found.</p>;
    return (
      <ItemDetailCard
        item={item}
        sources={sources.items[String(node.id)]}
        onNavigate={onNavigate}
        peekItem={(id) => itemIndex.get(id)}
      />
    );
  }

  if (node.type === "box") {
    const box = sources.boxes[String(node.id)];
    if (!box) return <p className="m-0 text-xs text-muted">Box not found.</p>;
    return (
      <Card className="flex flex-col gap-3">
        <h2 className="m-0 text-base font-semibold text-fg">{labelFor(node)}</h2>
        <div>
          <p className="m-0 text-[11px] font-medium uppercase tracking-wide text-muted">
            Appears on
          </p>
          <div className="flex flex-wrap gap-1.5">
            {box.stages.map((stage) => (
              <NavChip
                key={stage.stageKey}
                node={{ type: "stage", id: stage.stageKey }}
                label={stage.stageName}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="m-0 text-[11px] font-medium uppercase tracking-wide text-muted">Drops</p>
          <div className="flex flex-wrap gap-1.5">
            {box.drops.map((drop) => (
              <NavChip
                key={drop.itemKey}
                node={{ type: "item", id: drop.itemKey }}
                label={`${drop.name} (${drop.dropPct}%)`}
                onNavigate={onNavigate}
                peekItem={(id) => itemIndex.get(id)}
              />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const stage = sources.stages[String(node.id)];
  if (!stage) return <p className="m-0 text-xs text-muted">Stage not found.</p>;
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="m-0 text-base font-semibold text-fg">{labelFor(node)}</h2>
      <div>
        <p className="m-0 text-[11px] font-medium uppercase tracking-wide text-muted">Monsters</p>
        <p className="m-0 text-[13px] text-fg">{stage.monsters.join(", ") || "—"}</p>
      </div>
      <div>
        <p className="m-0 text-[11px] font-medium uppercase tracking-wide text-muted">Boxes</p>
        <div className="flex flex-wrap gap-1.5">
          {stage.boxes.map((box) => (
            <NavChip
              key={box.boxItemKey}
              node={{ type: "box", id: box.boxItemKey }}
              label={box.name}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}
