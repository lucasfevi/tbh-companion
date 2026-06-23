import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { RangeSlider } from "./RangeSlider";

/**
 * Dual-thumb range built on Base UI's Slider. Used for the Lookup level filter
 * (a fixed 1–100 scale); the consumer owns the bounds and decides that a
 * full-bounds range means "no filter". Pass `formatValue` to label the readout
 * (defaults to `Lv {n}`).
 */
function ControlledRangeSlider(props: {
  min?: number;
  max?: number;
  initial?: [number, number];
  disabled?: boolean;
  label?: string;
}) {
  const min = props.min ?? 1;
  const max = props.max ?? 100;
  const [value, setValue] = useState<[number, number]>(props.initial ?? [min, max]);
  return (
    <RangeSlider
      min={min}
      max={max}
      value={value}
      onValueChange={setValue}
      label={props.label ?? "Level"}
      disabled={props.disabled}
      className="w-64"
    />
  );
}

const meta = {
  title: "Design System/RangeSlider",
  component: RangeSlider,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof RangeSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

const noopArgs = {
  min: 1,
  max: 100,
  value: [1, 100] as [number, number],
  onValueChange: () => {},
};

export const FullRange: Story = {
  args: noopArgs,
  render: () => <ControlledRangeSlider />,
};

export const MidBand: Story = {
  args: noopArgs,
  render: () => <ControlledRangeSlider initial={[20, 60]} />,
};

export const Disabled: Story = {
  args: noopArgs,
  render: () => <ControlledRangeSlider initial={[20, 60]} disabled />,
};
