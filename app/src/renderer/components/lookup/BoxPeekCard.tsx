import { Card } from "../../design-system/primitives/Card/Card";
import { BoxCardDropSummary, BoxCardHeader } from "./BoxCardParts";
import type { LookupBoxSources } from "../../../../shared/types";

export function BoxPeekCard({ box, boxItemKey }: { box: LookupBoxSources; boxItemKey: number }) {
  return (
    <Card padding="compact" className="flex flex-col gap-2">
      <BoxCardHeader box={box} boxItemKey={boxItemKey} iconSize="md" />
      <BoxCardDropSummary box={box} />
    </Card>
  );
}
