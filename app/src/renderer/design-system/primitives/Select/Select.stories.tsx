import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Select } from "./Select";

/**
 * Themed dropdown built on Base UI's Select — replaces the old bespoke
 * SelectField, which had no arrow-key option navigation. Use `variant="ideal"`
 * only for the box-tracker's "farm at" ideal-stage picker (a domain-specific
 * highlight color); everything else should use the default variant. Pass a
 * `footer` for a reset/help link below the control — it reserves a fixed-height
 * slot even when empty, so toggling it never shifts surrounding layout.
 */
const STAGE_OPTIONS = [
  { value: 1, label: "Torment 1-1" },
  { value: 2, label: "Torment 1-2" },
  { value: 3, label: "Torment 1-3" },
  { value: 4, label: "Torment 2-1" },
];

function ControlledSelect(
  props: Omit<React.ComponentProps<typeof Select>, "value" | "onValueChange">,
) {
  const [value, setValue] = useState<string | number>(STAGE_OPTIONS[0].value);
  return <Select {...props} value={value} onValueChange={setValue} />;
}

const meta = {
  title: "Design System/Select",
  component: Select,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

const noopArgs = { options: STAGE_OPTIONS, value: 1, onValueChange: () => {} };

export const Default: Story = {
  args: noopArgs,
  render: () => <ControlledSelect label="Map" options={STAGE_OPTIONS} className="w-56" />,
};

export const IdealVariant: Story = {
  args: noopArgs,
  render: () => (
    <ControlledSelect label="Farm at" variant="ideal" options={STAGE_OPTIONS} className="w-56" />
  ),
};

export const WithFooter: Story = {
  args: noopArgs,
  render: () => (
    <ControlledSelect
      label="Farm at"
      options={STAGE_OPTIONS}
      className="w-56"
      footer={<span className="text-muted">Reset to default</span>}
    />
  ),
};

export const Disabled: Story = {
  args: { label: "Map", options: STAGE_OPTIONS, value: 1, onValueChange: () => {}, disabled: true },
};

export const LongOptionList: Story = {
  args: noopArgs,
  render: () => (
    <ControlledSelect
      label="Stage"
      options={Array.from({ length: 30 }, (_, i) => ({ value: i + 1, label: `Stage ${i + 1}` }))}
      className="w-56"
    />
  ),
};
