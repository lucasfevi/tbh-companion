import type { Meta, StoryObj } from "@storybook/react-vite";
import { TabPage } from "./TabPage";
import { TabHeader } from "../TabHeader/TabHeader";

/**
 * Vertical-stack body wrapper for a tab's content, paired with `TabHeader`
 * at the top. Every top-level tab (`Live`, `Inventory`, `Chests`, `Pets`,
 * `Market`, `Settings`, `About`) renders one of these as its root element.
 */
const meta = {
  title: "Design System/TabPage",
  component: TabPage,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof TabPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-96">
      <TabPage>
        <TabHeader title="Inventory" intro="Track your items and their Steam Market value." />
        <p className="m-0 text-sm text-muted">Tab body content goes here.</p>
      </TabPage>
    </div>
  ),
  args: { children: null },
};
