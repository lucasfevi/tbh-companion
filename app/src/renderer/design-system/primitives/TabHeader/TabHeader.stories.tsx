import type { Meta, StoryObj } from "@storybook/react-vite";
import { TabHeader } from "./TabHeader";

/**
 * Top-of-tab heading: `<h1>` title, optional intro paragraph, and optional
 * trailing children (e.g. a toolbar row) below it. One per tab — see
 * `TabPage` for the scrollable body wrapper it's almost always paired with.
 */
const meta = {
  title: "Design System/TabHeader",
  component: TabHeader,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof TabHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="w-96">
      <TabHeader {...args} />
    </div>
  ),
  args: { title: "Inventory" },
};

export const WithIntro: Story = {
  render: (args) => (
    <div className="w-96">
      <TabHeader {...args} />
    </div>
  ),
  args: {
    title: "Inventory",
    intro: "Track your items and their Steam Market value.",
  },
};
