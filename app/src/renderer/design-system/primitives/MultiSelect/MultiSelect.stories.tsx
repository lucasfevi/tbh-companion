import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MultiSelect, type MultiSelectGroup, type MultiSelectOption } from "./MultiSelect";

/**
 * Searchable, groupable, multi-value dropdown built on Base UI's Combobox. The
 * filter surfaces (Inventory, Lookup, Coin view) use it for grade/type/effect
 * etc. The trigger shows the selection summary; `value` is an array of selected
 * values and `[]` means "no selection". Set `searchable={false}` for short
 * lists, pass grouped options for sectioned lists, and give `allLabel` the
 * "show everything" copy (e.g. "All grades").
 */
const GRADES: MultiSelectOption[] = [
  { value: "COMMON", label: "Common" },
  { value: "RARE", label: "Rare" },
  { value: "EPIC", label: "Epic" },
  { value: "LEGENDARY", label: "Legendary" },
  { value: "ARCANA", label: "Arcana" },
  { value: "IMMORTAL", label: "Immortal" },
];

const EFFECT_GROUPS: MultiSelectGroup[] = [
  {
    label: "Offense",
    options: [
      { value: "atk", label: "Attack" },
      { value: "crit", label: "Crit Chance" },
      { value: "critdmg", label: "Crit Damage" },
    ],
  },
  {
    label: "Defense",
    options: [
      { value: "hp", label: "Health" },
      { value: "armor", label: "Armor" },
      { value: "dodge", label: "Dodge" },
    ],
  },
];

function ControlledMultiSelect(props: {
  options: MultiSelectOption[] | MultiSelectGroup[];
  label: string;
  allLabel: string;
  searchable?: boolean;
  initial?: string[];
}) {
  const [value, setValue] = useState<string[]>(props.initial ?? []);
  return (
    <MultiSelect
      options={props.options}
      value={value}
      onValueChange={setValue}
      label={props.label}
      allLabel={props.allLabel}
      searchable={props.searchable}
      className="w-56"
    />
  );
}

const meta = {
  title: "Design System/MultiSelect",
  component: MultiSelect,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof MultiSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

const noopArgs = { options: GRADES, value: [], onValueChange: () => {} };

export const Default: Story = {
  args: noopArgs,
  render: () => <ControlledMultiSelect options={GRADES} label="Grade" allLabel="All grades" />,
};

export const WithSelection: Story = {
  args: noopArgs,
  render: () => (
    <ControlledMultiSelect
      options={GRADES}
      label="Grade"
      allLabel="All grades"
      initial={["ARCANA", "IMMORTAL"]}
    />
  ),
};

export const NotSearchable: Story = {
  args: noopArgs,
  render: () => (
    <ControlledMultiSelect
      options={GRADES}
      label="Grade"
      allLabel="All grades"
      searchable={false}
    />
  ),
};

export const Grouped: Story = {
  args: { options: EFFECT_GROUPS, value: [], onValueChange: () => {} },
  render: () => (
    <ControlledMultiSelect options={EFFECT_GROUPS} label="Effect" allLabel="All effects" />
  ),
};
