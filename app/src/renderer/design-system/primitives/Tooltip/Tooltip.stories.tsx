import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tooltip } from "./Tooltip";

/**
 * Hover/focus-triggered popup built on Base UI's Tooltip. Pass any element
 * as `trigger` (merged onto Base UI's own trigger via the `render` prop, so
 * it keeps working as whatever element it already was — button, span, etc.).
 *
 * Intended as the eventual replacement for native `title="..."` attributes
 * — see `Overlay.tsx`'s `RATE_TIP`/`GOLD_TIP` constants, which currently use
 * `title` on a `cursor-help` `<p>`. Native `title` has no styling, no
 * keyboard dismiss, and inconsistent browser hover delay; this component
 * fixes all three. **Not yet wired into the overlay** — that migration is
 * an explicit future opt-in (kept out of scope here to avoid regression
 * risk in the 280×94 frameless overlay window).
 */
const meta = {
  title: "Design System/Tooltip",
  component: Tooltip,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tooltip trigger={<button type="button">Hover or focus me</button>} side="top">
      Tooltip content
    </Tooltip>
  ),
  args: {
    trigger: <button type="button">Open</button>,
    children: null,
  },
};

export const OverlayRateTipExample: Story = {
  name: "Overlay rate-tip example",
  render: () => (
    <Tooltip
      trigger={
        <p className="m-0 flex cursor-help items-baseline gap-1 text-sm text-fg">
          120 <span className="text-xs text-muted">XP/hr</span>
        </p>
      }
      side="bottom"
    >
      Average XP gained per hour across heroes active this session.
    </Tooltip>
  ),
  args: {
    trigger: <button type="button">Open</button>,
    children: null,
  },
};
