import { Card } from "../../design-system/primitives/Card/Card";
import { boxIconPath } from "../../lib/boxIconPath";
import { fmtDropPct, hasDropChance } from "../../lib/lookupDisplay";
import { ItemDetailCard } from "./ItemDetailCard";
import { SectionLabel } from "./itemCardParts";
import { ItemLink } from "./ItemLink";
import type {
  LookupItem,
  LookupSources,
  OfferingsModel,
  SynthesisModel,
} from "../../../../shared/types";
import type { LookupNavNode } from "../../lib/useLookupNav";

/** Renders the active Lookup-tab node: an item, a box, or a stage. */
export function EntityDetail({
  node,
  itemIndex,
  sources,
  synthesisModel,
  offerings,
  labelFor,
  onNavigate,
}: {
  node: LookupNavNode;
  itemIndex: Map<number, LookupItem>;
  sources: LookupSources;
  synthesisModel?: SynthesisModel | null;
  offerings?: OfferingsModel | null;
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
        synthesisModel={synthesisModel}
        offerings={offerings}
        onNavigate={onNavigate}
        peekItem={(id) => itemIndex.get(id)}
      />
    );
  }

  if (node.type === "box") {
    const box = sources.boxes[String(node.id)];
    if (!box) return <p className="m-0 text-xs text-muted">Box not found.</p>;
    const drops = box.drops.filter(hasDropChance);
    return (
      <Card className="flex flex-col gap-3">
        <h2 className="m-0 text-base font-semibold text-fg">{labelFor(node)}</h2>
        {box.stages.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <SectionLabel>Appears on</SectionLabel>
            <div className="flex flex-col gap-1">
              {box.stages.map((stage) => (
                <ItemLink
                  key={stage.stageKey}
                  node={{ type: "stage", id: stage.stageKey }}
                  name={stage.stageName}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ) : null}
        {drops.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <SectionLabel>Drops</SectionLabel>
            <div className="flex flex-col gap-1">
              {drops.map((drop) => (
                <ItemLink
                  key={drop.itemKey}
                  node={{ type: "item", id: drop.itemKey }}
                  name={drop.name}
                  grade={drop.grade}
                  iconPath={itemIndex.get(drop.itemKey)?.iconPath}
                  suffix={`· ${fmtDropPct(drop.dropPct)}%`}
                  onNavigate={onNavigate}
                  peekItem={(id) => itemIndex.get(id)}
                />
              ))}
            </div>
          </div>
        ) : null}
      </Card>
    );
  }

  const stage = sources.stages[String(node.id)];
  if (!stage) return <p className="m-0 text-xs text-muted">Stage not found.</p>;
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="m-0 text-base font-semibold text-fg">{labelFor(node)}</h2>
      <div className="flex flex-col gap-1.5">
        <SectionLabel>Monsters</SectionLabel>
        <p className="m-0 text-[13px] text-fg">{stage.monsters.join(", ") || "—"}</p>
      </div>
      {stage.boxes.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <SectionLabel>Boxes</SectionLabel>
          <div className="flex flex-col gap-1">
            {stage.boxes.map((box) => (
              <ItemLink
                key={box.boxItemKey}
                node={{ type: "box", id: box.boxItemKey }}
                name={box.name}
                grade={box.grade}
                iconPath={boxIconPath(box.boxItemKey)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
