import type { Meta, StoryObj } from "@storybook/react-vite";
import { NumberField, NumberInput } from "./NumberField";

/**
 * Numeric input built on Base UI's Number Field — no spinner buttons are
 * rendered (matches the app's existing visual chrome), but it gains
 * keyboard arrow-key stepping, min/max clamping, and character-level input
 * filtering for free. Use `NumberInput` standalone inside a `Field` wrapper
 * (Settings-tab style), or `NumberField` for the labeled+footer composite
 * (box-tracker cooldown/config style). `density="compact"` + `align="center"`
 * is the box-tracker convention for small numeric inputs.
 */
const meta = {
  title: "Design System/NumberField",
  component: NumberField,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof NumberField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: "Poll interval (seconds)", min: 1, defaultValue: 5 },
};

export const WithFooter: Story = {
  args: {
    label: "Cooldown (min)",
    labelAlign: "end",
    footerAlign: "end",
    density: "compact",
    align: "center",
    min: 1,
    max: 1440,
    step: 1,
    defaultValue: 90,
    footer: <span className="text-muted">Reset to 60</span>,
  },
};

export const Disabled: Story = {
  args: { label: "Poll interval (seconds)", min: 1, defaultValue: 5, disabled: true },
};

export const BareNumberInput: Story = {
  render: () => <NumberInput min={1} defaultValue={5} />,
};
