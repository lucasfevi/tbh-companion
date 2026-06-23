import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Checkbox } from "./Checkbox";

/**
 * Themed checkbox built on Base UI's Checkbox. Use for standalone boolean picks
 * inside menus/popovers (e.g. the Inventory column picker) — for a settings-style
 * on/off toggle prefer `Switch`. Pass `label` for a clickable box + text row;
 * omit it and pass `aria-label` for a bare box.
 */
function ControlledCheckbox(props: {
  defaultChecked?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const [checked, setChecked] = useState(props.defaultChecked ?? false);
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={setChecked}
      disabled={props.disabled}
      label={props.label}
      aria-label={props.label == null ? "Show grade column" : undefined}
    />
  );
}

const meta = {
  title: "Design System/Checkbox",
  component: Checkbox,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

const noopArgs = { checked: false, onCheckedChange: () => {} };

export const WithLabel: Story = {
  args: noopArgs,
  render: () => <ControlledCheckbox label="Show grade column" />,
};

export const Checked: Story = {
  args: noopArgs,
  render: () => <ControlledCheckbox label="Show grade column" defaultChecked />,
};

export const BareBox: Story = {
  args: noopArgs,
  render: () => <ControlledCheckbox />,
};

export const Disabled: Story = {
  args: noopArgs,
  render: () => <ControlledCheckbox label="Show grade column" disabled />,
};
