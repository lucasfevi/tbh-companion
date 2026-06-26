import { useCallback, useMemo } from "react";
import { useLookupCatalog } from "../lib/useLookupCatalog";
import { useLookupSources } from "../lib/useLookupSources";
import { useLookupSynthesisModel } from "../lib/useLookupSynthesisModel";
import { useOfferings } from "../lib/useOfferings";
import { buildBoxNameIndex, buildStageNameIndex } from "../lib/lookupGraph";
import { useEntityPanel } from "../context/entityPanelContext";
import { SidePanel } from "../design-system/primitives/SidePanel/SidePanel";
import { EntityDetail } from "./lookup/EntityDetail";
import type { LookupNavNode } from "../lib/useLookupNav";

/**
 * App-level side panel for entity details (items, boxes, stages).
 * Loads its own data so App.tsx stays lean. Any component can open it
 * via useEntityPanel().open(node).
 */
export function GlobalEntityPanel() {
  const { node, isOpen, navigate, close } = useEntityPanel();

  const items = useLookupCatalog();
  const sources = useLookupSources();
  const synthesisModel = useLookupSynthesisModel();
  const offerings = useOfferings();

  const itemIndex = useMemo(() => new Map((items ?? []).map((item) => [item.id, item])), [items]);

  const boxNames = useMemo(() => (sources ? buildBoxNameIndex(sources) : new Map()), [sources]);
  const stageNames = useMemo(() => (sources ? buildStageNameIndex(sources) : new Map()), [sources]);

  const labelFor = useCallback(
    (n: LookupNavNode): string => {
      if (n.type === "item") return itemIndex.get(n.id)?.name ?? `Item #${n.id}`;
      if (n.type === "box") return boxNames.get(n.id) ?? `Box #${n.id}`;
      return stageNames.get(n.id) ?? `Stage #${n.id}`;
    },
    [itemIndex, boxNames, stageNames],
  );

  const title = node ? labelFor(node) : "Details";

  return (
    <SidePanel open={isOpen} onOpenChange={(open) => !open && close()} title={title}>
      {node && sources ? (
        <EntityDetail
          node={node}
          itemIndex={itemIndex}
          sources={sources}
          synthesisModel={synthesisModel}
          offerings={offerings}
          labelFor={labelFor}
          onNavigate={navigate}
        />
      ) : null}
    </SidePanel>
  );
}
