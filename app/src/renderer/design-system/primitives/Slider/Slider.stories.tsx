import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Slider } from "./Slider";

/**
 * Single-thumb slider built on Base UI's Slider. Used for Settings volume and
 * threshold controls; the consumer owns the bounds and passes `formatValue` to
 * label the readout.
 */
function ControlledSlider(props: {
  min?: number;
  max?: number;
  initial?: number;
  disabled?: boolean;
  label?: string;
}) {
  const min = props.min ?? 0;
  const max = props.max ?? 100;
  const [value, setValue] = useState(props.initial ?? 75);
  return (
    <Slider
      min={min}
      max={max}
      value={value}
      onValueChange={setValue}
      label={props.label ?? "Volume"}
      formatValue={(n) => `${n}%`}
      disabled={props.disabled}
      className="w-64"
    />
  );
}

const meta = {
  title: "Design System/Slider",
  component: Slider,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

const noopArgs = {
  min: 0,
  max: 100,
  value: 75,
  onValueChange: () => {},
};

export const Default: Story = {
  args: noopArgs,
  render: () => <ControlledSlider />,
};

export const MidValue: Story = {
  args: noopArgs,
  render: () => <ControlledSlider initial={42} />,
};

export const Disabled: Story = {
  args: noopArgs,
  render: () => <ControlledSlider initial={60} disabled />,
};
