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
