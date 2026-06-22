import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SidePanel } from "./SidePanel";
import { Button } from "../Button/Button";

/**
 * Right-anchored sibling of Dialog — slides in from the right and scrolls its
 * own content internally. Used by the Lookup tab for item/box/stage detail.
 */
function ControlledSidePanel(props: { children: React.ReactNode; title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Open panel
      </Button>
      <SidePanel open={open} onOpenChange={setOpen} title={props.title}>
        {props.children}
      </SidePanel>
    </>
  );
}

const meta = {
  title: "Design System/SidePanel",
  component: SidePanel,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof SidePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ControlledSidePanel title="Item detail">
      <div className="flex flex-col gap-3">
        <h2 className="m-0 text-base font-semibold text-fg">Long Sword</h2>
        <p className="m-0 text-sm text-muted">Common · Lv 1</p>
        <p className="m-0 text-sm text-muted">Attack Damage +1, Attack Speed +10</p>
      </div>
    </ControlledSidePanel>
  ),
  args: { open: false, onOpenChange: () => {}, title: "Item detail", children: null },
};

export const LongContent: Story = {
  render: () => (
    <ControlledSidePanel title="Box detail">
      <div className="flex flex-col gap-2">
        <h2 className="m-0 text-base font-semibold text-fg">Stage Boss Box 7</h2>
        {Array.from({ length: 30 }, (_, i) => (
          <p key={i} className="m-0 text-sm text-muted">
            Drop entry #{i + 1}
          </p>
        ))}
      </div>
    </ControlledSidePanel>
  ),
  args: { open: false, onOpenChange: () => {}, title: "Box detail", children: null },
};
