import { cva, type VariantProps } from "../../lib/variants";

/**
 * One variant engine for every button-shaped control in the app. Absorbs the
 * old Button + IconButton + ToolbarButton + LinkButton + ExternalLink's
 * button/primaryButton variants (see docs/STYLING.md migration notes) so
 * spacing/hover/focus treatments can't drift between near-identical controls.
 *
 * `size` only affects the default/primary/danger/ghost/success variants —
 * toolbar/link/icon bake in their own fixed sizing via compoundVariants
 * (they never had a size axis in the original components either).
 *
 * Lives in its own file (not Button.tsx) so that file only exports
 * components — co-locating a non-component export there breaks Fast Refresh
 * boundary detection (react-refresh/only-export-components).
 */
export const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md border disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-card border-border text-fg hover:border-accent",
        primary: "bg-accent border-accent text-accent-fg font-semibold hover:brightness-[1.08]",
        danger: "bg-card border-danger text-danger-fg hover:border-danger",
        ghost: "border-border bg-transparent text-muted hover:border-muted hover:text-fg",
        success:
          "border-status-success-border bg-status-success/10 font-semibold text-status-success hover:bg-status-success/20",
        toolbar: "shrink-0 border-border bg-card text-muted hover:border-accent hover:text-fg",
        link: "rounded-none border-none bg-transparent text-inherit underline",
        icon: "rounded border-none bg-transparent text-muted hover:bg-card hover:text-fg",
      },
      size: {
        default: "px-3.5 py-1.5 text-[13px]",
        lg: "px-4 py-2.5 text-[13px]",
        sm: "px-2.5 py-0.5 text-xs",
      },
      edge: {
        start: "-ml-1",
        end: "-mr-1",
        none: "",
      },
    },
    compoundVariants: [
      { variant: "toolbar", class: "px-2.5 py-1.5 text-xs" },
      { variant: "link", class: "p-0 font-inherit" },
      { variant: "icon", class: "px-1 py-0 text-[13px] leading-none" },
    ],
    defaultVariants: { variant: "default", size: "default", edge: "none" },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
