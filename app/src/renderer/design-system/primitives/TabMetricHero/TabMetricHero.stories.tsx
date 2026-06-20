import type { Meta, StoryObj } from "@storybook/react-vite";
import { TabMetricHero } from "./TabMetricHero";

/**
 * Three-column hero card (primary metric, center detail block, optional
 * trailing action) — the Live tab's top XP/gold-rate banner is the sole
 * consumer. Collapses to two rows under 560px (`primary` spans full width,
 * `action` drops to its own row) for the mini overlay's narrow layout.
 */
const meta = {
  title: "Design System/TabMetricHero",
  component: TabMetricHero,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof TabMetricHero>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-[480px]">
      <TabMetricHero
        primary={
          <div className="flex items-baseline gap-2">
            <span className="text-[40px] font-bold leading-none text-accent">1.2K</span>
            <span className="text-[13px] tracking-wide text-muted">XP / hr</span>
          </div>
        }
        center={
          <>
            <div className="text-[15px] font-semibold leading-tight text-gold">500 gold / hr</div>
            <div className="text-xs text-muted">Session elapsed: 1h 24m</div>
          </>
        }
        action={
          <button type="button" className="text-xs text-muted underline">
            Reset
          </button>
        }
      />
    </div>
  ),
  args: { primary: null, center: null },
};
