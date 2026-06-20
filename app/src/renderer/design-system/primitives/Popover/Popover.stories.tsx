import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Popover } from "./Popover";
import { Button } from "../Button/Button";

/**
 * Anchored popup panel built on Base UI's Popover — replaces the old
 * AnchoredPanel's hand-rolled viewport-clamping math. Pass any element as
 * `trigger` (it's merged onto Base UI's own trigger button via the `render`
 * prop, so it stays a real, accessible button). The panel always opens
 * below and end-aligned with the trigger, flipping above if it would
 * overflow the viewport bottom — exactly like InventoryColumnPicker's
 * "Columns" picker.
 */
function ControlledPopover(props: {
  trigger: React.ReactElement;
  children: React.ReactNode;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger={props.trigger}
      aria-label={props.ariaLabel}
    >
      {props.children}
    </Popover>
  );
}

const meta = {
  title: "Design System/Popover",
  component: Popover,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ControlledPopover trigger={<Button size="sm">Open panel</Button>} ariaLabel="Example panel">
      <p className="m-0 w-48 text-xs text-fg">Anchored popup content goes here.</p>
    </ControlledPopover>
  ),
  args: {
    open: false,
    onOpenChange: () => {},
    trigger: <Button>Open</Button>,
    children: null,
    "aria-label": "Example panel",
  },
};

export const ColumnPickerExample: Story = {
  render: () => (
    <ControlledPopover trigger={<Button size="sm">Columns</Button>} ariaLabel="Visible columns">
      <div className="flex w-48 flex-col gap-1.5 text-xs text-fg">
        <label className="flex items-center gap-2">
          <input type="checkbox" defaultChecked /> Grade
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" defaultChecked /> Level
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" /> Type
        </label>
      </div>
    </ControlledPopover>
  ),
  args: {
    open: false,
    onOpenChange: () => {},
    trigger: <Button>Open</Button>,
    children: null,
    "aria-label": "Visible columns",
  },
};
