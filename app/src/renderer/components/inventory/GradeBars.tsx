import { GRADE_ORDER } from "../../../core/grades";
import { gradeLabel } from "../../../core/labels";
import type { InventoryComposition } from "../../../../shared/types";
import { gradeColor } from "../../lib/gradeColor";

export function GradeBars({ composition }: { composition: InventoryComposition }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {GRADE_ORDER.filter((g) => composition.byGrade[g]).map((g) => (
        <div key={g} className="flex items-center gap-1.5 text-xs">
          <span
            className="inline-block size-[9px] shrink-0 rounded-full"
            style={{ background: gradeColor(g) }}
          />
          <span style={{ color: gradeColor(g) }}>{gradeLabel(g)}</span>
          <span className="text-muted">{composition.byGrade[g]}</span>
        </div>
      ))}
    </div>
  );
}
