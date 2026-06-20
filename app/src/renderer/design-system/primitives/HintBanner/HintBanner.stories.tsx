import type { Meta, StoryObj } from "@storybook/react-vite";
import { HintBanner } from "./HintBanner";

/**
 * Gold-accented inline callout for a single informational/warning message
 * (e.g. "Player.log not found", "N items not in the catalog"). Not a
 * dismissible toast — it renders inline wherever the condition applies and
 * disappears when the condition clears.
 */
const meta = {
  title: "Design System/HintBanner",
  component: HintBanner,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof HintBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Player.log not found beside your save. Launch the game to track drops.",
    className: "w-80",
  },
};

export const MutedVariant: Story = {
  name: "Muted variant (override accent)",
  args: {
    children: "Updating Steam prices in the background…",
    className: "w-80 border-l-muted text-muted",
  },
};
