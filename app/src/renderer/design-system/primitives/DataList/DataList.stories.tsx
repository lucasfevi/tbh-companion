import type { Meta, StoryObj } from "@storybook/react-vite";
import { DataList, DataListRow } from "./DataList";

/**
 * Bordered list shell (`DataList`) with zebra-striped rows (`DataListRow`,
 * striped by the `index` you pass it). Use `shell="none"` when nesting
 * inside a `PanelSection boxed` Card, which already supplies the border.
 */
const meta = {
  title: "Design System/DataList",
  component: DataList,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof DataList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <DataList className="w-72">
      {["Common chest", "Stage boss chest", "Rune box"].map((label, index) => (
        <DataListRow key={label} index={index}>
          {label}
        </DataListRow>
      ))}
    </DataList>
  ),
  args: { children: null },
};

export const NoShell: Story = {
  name: "shell=none (nested in a Card)",
  render: () => (
    <div className="w-72 rounded-lg border border-border bg-card p-1">
      <DataList shell="none">
        {["Common chest", "Stage boss chest"].map((label, index) => (
          <DataListRow key={label} index={index}>
            {label}
          </DataListRow>
        ))}
      </DataList>
    </div>
  ),
  args: { children: null },
};
