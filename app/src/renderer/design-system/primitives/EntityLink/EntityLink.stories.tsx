import type { Meta, StoryObj } from "@storybook/react-vite";
import { EntityLink } from "./EntityLink";

/**
 * Presentational inline entity link. Domain wrappers (ItemLink, future StageLink)
 * supply icons, colors, and peek cards — this primitive only handles layout and
 * interaction affordance.
 */
const meta = {
  title: "Design System/EntityLink",
  component: EntityLink,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof EntityLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Static: Story = {
  args: {
    label: "Iron Ore",
  },
};

export const Colored: Story = {
  args: {
    label: "Rare Sword",
    color: "#c9a227",
  },
};

export const UncoloredInteractive: Story = {
  args: {
    label: "Unknown Item",
    onClick: () => {},
  },
};

export const WithSuffix: Story = {
  args: {
    label: "Boss Chest",
    color: "#8b5cf6",
    suffix: "· First clear only",
    suffixTone: "gold",
    onClick: () => {},
  },
};

export const WithPeek: Story = {
  args: {
    label: "Iron Ore",
    color: "#6b7280",
    onClick: () => {},
    peek: (
      <div className="rounded-lg border border-border bg-card p-3 text-xs text-fg">
        Material peek card placeholder
      </div>
    ),
  },
};
