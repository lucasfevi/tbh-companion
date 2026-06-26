import type { Meta, StoryObj } from "@storybook/react-vite";
import { Field } from "./Field";
import { Input } from "../Input/Input";

/**
 * Wraps a form control in a `<label>` with a sentence-case label and optional
 * hint line below. For boolean on/off rows, use the `Checkbox` primitive with
 * its own `label` prop — do not use `Field`'s deprecated `checkbox` layout.
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
