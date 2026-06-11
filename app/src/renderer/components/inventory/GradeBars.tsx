import { GRADE_ORDER } from "../../../core/grades";
import { gradeLabel } from "../../../core/labels";
import type { InventoryComposition } from "../../../../shared/types";

const GRADE_COLORS: Record<string, string> = {
  COMMON: "#9aa3b2",
  UNCOMMON: "#5ad17a",
  RARE: "#4aa3ff",
  LEGENDARY: "#e8c45a",
  IMMORTAL: "#ff6b6b",
  ARCANA: "#c46bff",
  BEYOND: "#ff8c42",
  CELESTIAL: "#4ad7d1",
  DIVINE: "#ffd9f0",
  COSMIC: "#a0f0ff",
  UNKNOWN: "#6b7280",
};

export function gradeColor(grade: string): string {
  return GRADE_COLORS[grade] ?? GRADE_COLORS.UNKNOWN;
}

export function GradeBars({ composition }: { composition: InventoryComposition }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {GRADE_ORDER.filter((g) => composition.byGrade[g]).map((g) => (
        <div
          key={g}
          className="flex items-center gap-1.5 text-xs"
          title={`${g}: ${composition.byGrade[g]}`}
        >
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
