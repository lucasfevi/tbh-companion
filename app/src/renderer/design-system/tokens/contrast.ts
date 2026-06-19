/**
 * WCAG 2.x contrast-ratio math (relative luminance + the (L1+0.05)/(L2+0.05)
 * ratio formula). Pure, no DOM — jsdom can't paint, so this is the only place
 * we verify the palette actually meets AA, instead of relying on axe's
 * color-contrast rule (which requires real rendering and is a no-op in jsdom).
 */
function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return [r, g, b];
}

function channelLuminance(channel8bit: number): number {
  const c = channel8bit / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/** Returns the WCAG contrast ratio between two colors, from 1 (no contrast) to 21 (max). */
export function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG AA thresholds: 4.5:1 for normal text, 3:1 for large text / UI components. */
export const WCAG_AA_NORMAL = 4.5;
export const WCAG_AA_LARGE = 3;
