import type { Meta, StoryObj } from "@storybook/react-vite";
import { ItemIcon } from "./ItemIcon";

const PLACEHOLDER_SRC =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="#5ad17a"/></svg>',
  );

const GRADE_COLORS: Record<string, string> = {
  COMMON: "#9aa3b2",
  UNCOMMON: "#5ad17a",
  RARE: "#4aa3ff",
  LEGENDARY: "#e8c45a",
  IMMORTAL: "#ff6b6b",
  ARCANA: "#c46bff",
  BEYOND: "#ff8c42",
  CELESTIAL: "#4ad7d1",
  DIVINE: "#ffd9f0",
  COSMIC: "#a0f0ff",
};

/**
 * Item icon box with a grade-tinted gradient background, used by Lookup-tab
 * cards. Takes a resolved `src` URL and `color` hex string (not a grade name)
 * so it stays free of app-specific grade-palette knowledge.
 */
const meta = {
  title: "Design System/ItemIcon",
  component: ItemIcon,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof ItemIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Small: Story = {
  args: { src: PLACEHOLDER_SRC, color: GRADE_COLORS.LEGENDARY, size: "sm" },
};
export const Large: Story = {
  args: { src: PLACEHOLDER_SRC, color: GRADE_COLORS.ARCANA, size: "lg" },
};

export const AllGrades: Story = {
  args: { src: PLACEHOLDER_SRC, color: GRADE_COLORS.COMMON },
  render: () => (
    <div className="flex flex-wrap gap-3">
      {Object.entries(GRADE_COLORS).map(([grade, color]) => (
        <div key={grade} className="flex flex-col items-center gap-1">
          <ItemIcon src={PLACEHOLDER_SRC} color={color} size="lg" />
          <span className="text-[10px] text-muted">{grade}</span>
        </div>
      ))}
    </div>
  ),
};
