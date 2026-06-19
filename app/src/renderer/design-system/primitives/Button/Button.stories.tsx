import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, ButtonLink } from "./Button";

/**
 * Usage notes for whoever (human or agent) reaches for this component next:
 *
 * - `default` is the baseline action button — use it when nothing else fits.
 * - `primary` marks the single most important action on a screen/section
 *   (e.g. a confirm/save button). Don't use more than one `primary` per view.
 * - `danger` is for destructive or irreversible actions.
 * - `ghost` is a lower-emphasis secondary action next to a `primary`/`default`.
 * - `success` communicates a positive/completed state (rare — most actions
 *   should be `default`/`primary`).
 * - `toolbar` is for the main-window toolbar row (Mini, Stage chests, etc).
 * - `link` renders as a button element but looks like an inline text link —
 *   use for "Reset" / "Clear" affordances inside a stat row, not page nav.
 * - `icon` is for icon-only controls (overlay chrome, close/expand buttons).
 *   Pair with `edge="start"`/`edge="end"` when the icon sits at the start/end
 *   of a row, so it aligns optically with the row's padding.
 * - For an external link styled as a button, use `ButtonLink` (same variant
 *   API, renders an `<a target="_blank">` instead of a `<button>`).
 */
const meta = {
  title: "Design System/Button",
  component: Button,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "Default", variant: "default" },
};

export const Primary: Story = {
  args: { children: "Save changes", variant: "primary" },
};

export const Danger: Story = {
  args: { children: "Delete", variant: "danger" },
};

export const Ghost: Story = {
  args: { children: "Cancel", variant: "ghost" },
};

export const Success: Story = {
  args: { children: "Completed", variant: "success" },
};

export const AsToolbarButton: Story = {
  args: { children: "Mini", variant: "toolbar" },
};

export const AsLinkButton: Story = {
  args: { children: "Reset", variant: "link" },
};

export const IconOnly: Story = {
  args: { children: "✕", variant: "icon", "aria-label": "Close" },
};

export const IconOnlyEdgeEnd: Story = {
  args: { children: "✕", variant: "icon", edge: "end", "aria-label": "Close" },
};

export const LargeSize: Story = {
  args: { children: "Large", variant: "primary", size: "lg" },
};

export const SmallSize: Story = {
  args: { children: "Small", variant: "default", size: "sm" },
};

export const Disabled: Story = {
  args: { children: "Unavailable", variant: "primary", disabled: true },
};

export const ExternalLinkPrimary: Story = {
  render: (args) => (
    <ButtonLink href="https://example.com" variant="primary">
      {args.children}
    </ButtonLink>
  ),
  args: { children: "Open in browser" },
};
