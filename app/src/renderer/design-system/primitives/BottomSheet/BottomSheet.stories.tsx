import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BottomSheet } from "./BottomSheet";
import { Button } from "../Button/Button";

/**
 * Bottom-anchored sibling of Dialog — same Base UI foundation, but slides up
 * from the bottom and scrolls its own content internally past `max-h-[70vh]`.
 * Used by the Lookup tab for item/box/stage detail.
 */
function ControlledBottomSheet(props: { children: React.ReactNode; title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Open sheet
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen} title={props.title}>
        {props.children}
      </BottomSheet>
    </>
  );
}

const meta = {
  title: "Design System/BottomSheet",
  component: BottomSheet,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof BottomSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ControlledBottomSheet title="Item detail">
      <div className="flex flex-col gap-3">
        <h2 className="m-0 text-base font-semibold text-fg">Long Sword</h2>
        <p className="m-0 text-sm text-muted">Common · Lv 1</p>
        <p className="m-0 text-sm text-muted">Attack Damage +1, Attack Speed +10</p>
      </div>
    </ControlledBottomSheet>
  ),
  args: { open: false, onOpenChange: () => {}, title: "Item detail", children: null },
};

export const LongContent: Story = {
  render: () => (
    <ControlledBottomSheet title="Box detail">
      <div className="flex flex-col gap-2">
        <h2 className="m-0 text-base font-semibold text-fg">Stage Boss Box 7</h2>
        {Array.from({ length: 30 }, (_, i) => (
          <p key={i} className="m-0 text-sm text-muted">
            Drop entry #{i + 1}
          </p>
        ))}
      </div>
    </ControlledBottomSheet>
  ),
  args: { open: false, onOpenChange: () => {}, title: "Box detail", children: null },
};
