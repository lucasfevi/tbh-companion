import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./Input";

/**
 * Plain styled `<input>` — no Base UI behind it (a native text input needs no
 * extra accessible behavior). Pair with `Field` for a labeled form row.
 */
const meta = {
  title: "Design System/Input",
  component: Input,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { placeholder: "Search items...", className: "w-64" },
};

export const Disabled: Story = {
  args: { placeholder: "Search items...", className: "w-64", disabled: true },
};
