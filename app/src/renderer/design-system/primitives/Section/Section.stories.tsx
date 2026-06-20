import type { Meta, StoryObj } from "@storybook/react-vite";
import { Section } from "./Section";

/**
 * Plain sentence-case heading + content, no Card chrome. Lighter-weight than
 * `PanelSection` (which uses an uppercase tracking-wide heading and supports
 * `boxed`/`fill`) — use `Section` for simple grouped content like an About
 * tab block or a Settings sub-group.
 */
const meta = {
  title: "Design System/Section",
  component: Section,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Section>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "App info",
    children: <p className="m-0 text-sm text-muted">Version 1.2.3</p>,
    className: "w-72",
  },
};
