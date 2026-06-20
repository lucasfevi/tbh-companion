import type { Meta, StoryObj } from "@storybook/react-vite";
import { PanelSection } from "./PanelSection";

/**
 * Uppercase section heading + content. `boxed` wraps the content in a Card
 * (Live tab's lists, chest breakdown); `fill` makes the boxed Card grow to
 * match a sibling column's height (Live tab's history panels) — both are
 * no-ops without each other's context, so they're usually set together.
 */
const meta = {
  title: "Design System/PanelSection",
  component: PanelSection,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof PanelSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Heroes",
    children: <p className="m-0 text-sm text-muted">Unboxed content goes here.</p>,
    className: "w-72",
  },
};

export const Boxed: Story = {
  args: {
    title: "Chest breakdown",
    boxed: true,
    children: <p className="m-0 p-3 text-sm text-muted">Boxed content goes here.</p>,
    className: "w-72",
  },
};
