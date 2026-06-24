import { gradeLabel } from "../../../core/labels";
import {
  boxCategoryLabel,
  FIRST_DROP_ONLY_LABEL,
  summarizeSpawnPcts,
} from "../../../core/lookup/boxDisplay";
import { boxIconPath } from "../../lib/boxIconPath";
import { fmtDropPct } from "../../lib/lookupDisplay";
import { gradeColor } from "../../lib/gradeColor";
import { iconSrc } from "../../lib/iconSrc";
import { cn } from "../../lib/cn";
import { Card } from "../../design-system/primitives/Card/Card";
import { ItemIcon } from "../../design-system/primitives/ItemIcon/ItemIcon";
import type { LookupBoxSources } from "../../../../shared/types";

function formatSpawnSummary(box: LookupBoxSources): string | null {
  const summary = summarizeSpawnPcts(box.stages);
  if (!summary) return null;
  if (summary.min === summary.max) return `${fmtDropPct(summary.min)}%`;
  return `${fmtDropPct(summary.min)}–${fmtDropPct(summary.max)}%`;
}

export function BoxPeekCard({ box, boxItemKey }: { box: LookupBoxSources; boxItemKey: number }) {
  const spawnSummary = box.firstDropOnly ? null : formatSpawnSummary(box);
  const color = box.grade ? gradeColor(box.grade) : undefined;

  return (
    <Card padding="compact" className="flex gap-2">
      <ItemIcon
        src={iconSrc(boxIconPath(boxItemKey))}
        color={color ?? gradeColor("COMMON")}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-[13px] font-medium text-fg">{box.name}</p>
        <p className="m-0 truncate text-[11px]" style={color ? { color } : undefined}>
          {box.grade ? `${gradeLabel(box.grade)} · ` : ""}
          {boxCategoryLabel(box.category)}
        </p>
        {box.firstDropOnly ? (
          <p className={cn("m-0 truncate text-[11px] text-gold")}>{FIRST_DROP_ONLY_LABEL}</p>
        ) : null}
        {spawnSummary ? (
          <p className="m-0 truncate text-[11px] text-muted">Drop chance · {spawnSummary}</p>
        ) : null}
      </div>
    </Card>
  );
}
