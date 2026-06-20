import type { Meta, StoryObj } from "@storybook/react-vite";
import { CapacityBar } from "./CapacityBar";

/**
 * Pill-shaped fill bar for slot/inventory capacity (chests, pet progress,
 * box tracker cooldowns). `variant` picks the fill color by meaning (gray =
 * neutral/unlocked, blue = in progress, red = near/at capacity) — callers
 * compute which variant applies, this component doesn't infer it from
 * `percent`. Spreads extra props through to the root `<div>` so callers can
 * add `role="progressbar"`/`aria-valuenow` themselves when the bar conveys
 * real progress (see Chests.tsx, Pets.tsx).
 */
const meta = {
  title: "Design System/CapacityBar",
  component: CapacityBar,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof CapacityBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="w-64">
      <CapacityBar {...args} />
    </div>
  ),
  args: { percent: 60, variant: "blue" },
};

export const NearCapacity: Story = {
  render: (args) => (
    <div className="w-64">
      <CapacityBar {...args} />
    </div>
  ),
  args: { percent: 92, variant: "red" },
};

export const Compact: Story = {
  render: (args) => (
    <div className="w-64">
      <CapacityBar {...args} />
    </div>
  ),
  args: { percent: 40, variant: "gray", compact: true },
};
