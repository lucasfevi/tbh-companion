import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatCard } from "./StatCard";

/**
 * Compact labeled-value card for grids of small stats (Live tab's session
 * XP/gold/elapsed/rate row). `valueFirst` flips the layout for cards where
 * the number should be the visual anchor; `detail` adds a third line below
 * (e.g. a per-hour rate under a chest count). `variant="highlight"` switches
 * to a large accent-colored headline value with no panel background (used
 * for Inventory's market-value summary tiles).
 */
const meta = {
  title: "Design System/StatCard",
  component: StatCard,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof StatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: "Session XP", value: "1.2K", className: "w-40" },
};

export const ValueFirst: Story = {
  args: { label: "Session XP", value: "1.2K", valueFirst: true, className: "w-40" },
};

export const WithDetail: Story = {
  args: { label: "Common chests", value: "42", detail: "12/hr", className: "w-40" },
};

export const Highlight: Story = {
  args: {
    label: "Market value",
    value: "$1,284.50",
    detail: "$1,150.20 after Steam fees",
    variant: "highlight",
    className: "w-52",
  },
};
