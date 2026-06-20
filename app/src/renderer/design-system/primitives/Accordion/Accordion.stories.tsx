import type { Meta, StoryObj } from "@storybook/react-vite";
import { Accordion } from "./Accordion";

/**
 * One collapsible section per instance — each Accordion you render is fully
 * independent (not part of a shared open/close group). `variant="panel"` is
 * for boxed sections with a visible border (Settings Advanced, Notification
 * sounds). `variant="card"` is for lightweight inline disclosure inside an
 * already-bordered Card (Pets "Best stages", Chests "Capacity details").
 * `variant="default"` is unstyled chrome for ad hoc use.
 */
const meta = {
  title: "Design System/Accordion",
  component: Accordion,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Section title",
    children: <p className="m-0 text-sm text-muted">Collapsible content goes here.</p>,
  },
  decorators: [(Story) => <div className="w-72">{Story()}</div>],
};

export const Panel: Story = {
  args: {
    variant: "panel",
    title: "Advanced — logs and cached data",
    children: <p className="m-0 text-xs text-muted">Boxed section content.</p>,
  },
  decorators: [(Story) => <div className="w-72">{Story()}</div>],
};

export const Card: Story = {
  args: {
    variant: "card",
    title: "Capacity details",
    children: <p className="m-0 text-xs text-muted">100 base, +20 from rune nodes</p>,
  },
  decorators: [
    (Story) => <div className="w-72 rounded-lg border border-border bg-card p-3">{Story()}</div>,
  ],
};
