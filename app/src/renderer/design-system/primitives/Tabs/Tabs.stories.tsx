import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tabs } from "./Tabs";
import { TabsList, TabsPanel, TabsTab } from "./TabsParts";

/**
 * Accessible tabs built on Base UI's Tabs — full `role="tablist"`/
 * `role="tab"`/`role="tabpanel"` semantics and arrow-key navigation, neither
 * of which `AppTabBar.tsx` has today (it's a plain `<nav>` of `<button>`s).
 * Styled to match `AppTabBar`'s current look so a future migration is a
 * drop-in. **Not migrated in this phase** — `AppTabBar` also renders
 * `AppToolbar` (non-tab buttons) in the same row, so folding it onto this
 * primitive is left as an explicit future task, not done here.
 */
function ControlledTabs() {
  const [value, setValue] = useState("live");
  return (
    <Tabs value={value} onValueChange={setValue} className="w-96">
      <TabsList>
        <TabsTab value="live">Live</TabsTab>
        <TabsTab value="inventory">Inventory</TabsTab>
        <TabsTab value="settings" disabled>
          Settings
        </TabsTab>
      </TabsList>
      <TabsPanel value="live" className="p-3 text-sm">
        Live session stats go here.
      </TabsPanel>
      <TabsPanel value="inventory" className="p-3 text-sm">
        Inventory valuation goes here.
      </TabsPanel>
      <TabsPanel value="settings" className="p-3 text-sm">
        Settings (disabled in this example).
      </TabsPanel>
    </Tabs>
  );
}

const meta = {
  title: "Design System/Tabs",
  component: Tabs,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <ControlledTabs />,
  args: {
    defaultValue: "live",
    children: null,
  },
};
