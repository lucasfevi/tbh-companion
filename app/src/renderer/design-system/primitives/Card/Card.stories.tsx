import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "./Card";
import { CardContent, CardFooter, CardHeader } from "./CardParts";

/**
 * Generic bordered panel. Use `padding="compact"` for dense rows (e.g. data
 * tables), `padding="none"` when the child content manages its own padding.
 * `as="li"` when the Card is itself a list item (e.g. a chest history row).
 */
const meta = {
  title: "Design System/Card",
  component: Card,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "Default padding", className: "w-64 text-fg" },
};

export const Compact: Story = {
  args: { children: "Compact padding", padding: "compact", className: "w-64 text-fg" },
};

export const NoPadding: Story = {
  args: {
    children: "No padding (child manages its own)",
    padding: "none",
    className: "w-64 text-fg",
  },
};

/** Header / content / footer anatomy — footer only renders when it has content (e.g. a future price row). */
export const WithAnatomy: Story = {
  render: () => (
    <Card className="w-64 text-fg">
      <CardHeader>
        <span className="font-medium">Ancient Orb</span>
      </CardHeader>
      <CardContent>
        <p className="m-0 text-muted">Body content goes here.</p>
      </CardContent>
      <CardFooter>
        <span className="text-muted">Market price</span>
        <span>1,200g</span>
      </CardFooter>
    </Card>
  ),
};
