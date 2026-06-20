import type { Meta, StoryObj } from "@storybook/react-vite";
import { Field } from "./Field";
import { Input } from "../Input/Input";

/**
 * Wraps a form control in a `<label>` with a heading-style label and
 * optional hint line below. `checkbox` flips the layout to checkbox-first
 * (children before the inline label) for native `<input type="checkbox">`
 * rows — see Settings.tsx for the dominant real-world usage pattern.
 */
const meta = {
  title: "Design System/Field",
  component: Field,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Poll interval (seconds)",
    children: <Input className="w-48" defaultValue={5} />,
    className: "w-64",
  },
};

export const WithHint: Story = {
  args: {
    label: "Rolling window (minutes)",
    hint: "Changing this resets the current session.",
    children: <Input className="w-48" defaultValue={60} />,
    className: "w-64",
  },
};

export const Checkbox: Story = {
  args: {
    label: "Enable notifications",
    checkbox: true,
    children: <input type="checkbox" defaultChecked />,
  },
};
