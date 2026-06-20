import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Switch } from "./Switch";

/**
 * Boolean on/off toggle built on Base UI's Switch. No current consumer in
 * the app — added ahead of need, for the next boolean-setting toggle
 * (e.g. a future Settings checkbox-style option) so it doesn't get
 * hand-rolled again. `aria-label` is required since the control renders no
 * visible text of its own — pair it with an adjacent `<label>` in real
 * usage for a clickable hit target, same as a native checkbox.
 */
function ControlledSwitch(props: { defaultChecked?: boolean; disabled?: boolean }) {
  const [checked, setChecked] = useState(props.defaultChecked ?? false);
  return (
    <Switch
      checked={checked}
      onCheckedChange={setChecked}
      disabled={props.disabled}
      aria-label="Enable notifications"
    />
  );
}

const meta = {
  title: "Design System/Switch",
  component: Switch,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <ControlledSwitch />,
  args: {
    checked: false,
    onCheckedChange: () => {},
    "aria-label": "Enable notifications",
  },
};

export const Checked: Story = {
  render: () => <ControlledSwitch defaultChecked />,
  args: {
    checked: true,
    onCheckedChange: () => {},
    "aria-label": "Enable notifications",
  },
};

export const Disabled: Story = {
  render: () => <ControlledSwitch disabled />,
  args: {
    checked: false,
    onCheckedChange: () => {},
    disabled: true,
    "aria-label": "Enable notifications",
  },
};
