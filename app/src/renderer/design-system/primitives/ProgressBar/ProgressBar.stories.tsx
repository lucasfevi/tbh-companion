import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProgressBar } from "./ProgressBar";

/**
 * Linear fill bar with an optional label rendered below it (used for
 * download/refresh progress — e.g. the in-app updater on About, Steam price
 * refresh). Purely presentational; pass the percentage text/description as
 * `label` rather than relying on the bar alone to convey progress.
 */
const meta = {
  title: "Design System/ProgressBar",
  component: ProgressBar,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="w-64">
      <ProgressBar {...args} />
    </div>
  ),
  args: {
    percent: 42,
    label: <span className="text-xs text-muted">42/100 priced</span>,
  },
};

export const NoLabel: Story = {
  render: (args) => (
    <div className="w-64">
      <ProgressBar {...args} />
    </div>
  ),
  args: { percent: 75 },
};
