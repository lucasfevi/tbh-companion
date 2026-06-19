/**
 * Mirrors the `@theme` block in `app/src/renderer/styles.css`. This is the
 * single source of truth for token *names* — if you add/rename a token here,
 * update styles.css too (and vice versa). Used by contrast.ts; not meant to
 * replace Tailwind classes in components.
 */
export const colorTokens = {
  bg: "#0f1117",
  panel: "#171a23",
  card: "#1d212c",
  border: "#2a2f3d",
  fg: "#e8eaf0",
  muted: "#8b93a7",
  accent: "#5ad17a",
  accentFg: "#0c0f14",
  danger: "#d15a5a",
  dangerFg: "#f0a0a0",
  gold: "#e8c45a",
  statusInfo: "#5a9fd1",
  statusInfoBorder: "#3a6a8a",
  statusSuccess: "#6fcf97",
  statusSuccessBorder: "#3d6b52",
  statusDanger: "#c94a4a",
  statusMuted: "#9aa3b5",
  ideal: "#4aa3ff",
} as const;

export type ColorToken = keyof typeof colorTokens;
