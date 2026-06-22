// Hues adapted from the game's extracted grade colors, softened in saturation
// and lightness to fit the app's muted dark palette.
const GRADE_COLORS: Record<string, string> = {
  COMMON: "#c9ccd2",
  UNCOMMON: "#8fd862",
  RARE: "#4aa3ff",
  LEGENDARY: "#dfc149",
  IMMORTAL: "#dd6c5f",
  ARCANA: "#dc90df",
  BEYOND: "#dd5f9e",
  CELESTIAL: "#5cd2d6",
  DIVINE: "#e3dbb5",
  COSMIC: "#e574e7",
  UNKNOWN: "#6b7280",
};

export function gradeColor(grade: string): string {
  return GRADE_COLORS[grade] ?? GRADE_COLORS.UNKNOWN;
}
