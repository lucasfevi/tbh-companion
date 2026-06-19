import { describe, expect, it } from "vitest";
import { colorTokens } from "../../../src/renderer/design-system/tokens/colors";
import {
  contrastRatio,
  WCAG_AA_LARGE,
  WCAG_AA_NORMAL,
} from "../../../src/renderer/design-system/tokens/contrast";

/**
 * Locks in WCAG AA compliance for every fg/bg token pairing actually used by
 * components today. jsdom can't paint, so axe's color-contrast rule is a
 * no-op there — this is the only place the palette's contrast is verified.
 * If you add a new token pairing to a component, add it here too.
 */
const textPairs: Array<[fg: keyof typeof colorTokens, bg: keyof typeof colorTokens]> = [
  ["fg", "bg"],
  ["fg", "panel"],
  ["fg", "card"],
  ["muted", "bg"],
  ["muted", "panel"],
  ["muted", "card"],
  ["accentFg", "accent"],
  ["dangerFg", "card"],
  ["dangerFg", "bg"],
  ["gold", "bg"],
  ["statusInfo", "card"],
  ["statusSuccess", "card"],
  ["statusMuted", "bg"],
  ["ideal", "bg"],
  ["accent", "bg"],
  ["accent", "card"],
];

// Border/UI-component pairs only need the lower 3:1 threshold (WCAG 1.4.11).
const uiPairs: Array<[fg: keyof typeof colorTokens, bg: keyof typeof colorTokens]> = [
  ["danger", "card"],
];

describe("design system color tokens meet WCAG AA", () => {
  it.each(textPairs)("text %s on %s meets the 4.5:1 AA threshold", (fg, bg) => {
    expect(contrastRatio(colorTokens[fg], colorTokens[bg])).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });

  it.each(uiPairs)("UI element %s on %s meets the 3:1 AA threshold", (fg, bg) => {
    expect(contrastRatio(colorTokens[fg], colorTokens[bg])).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
  });
});
