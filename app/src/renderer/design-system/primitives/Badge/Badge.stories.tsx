import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "./Badge";

/**
 * Small status pill. `full` is the loud/attention-grabbing variant (e.g. a
 * chest that's full and needs action). `info`/`success`/`muted` are quieter
 * summary pills. `statusReady`/`statusCooldown` are for box-tracker-style
 * ready/cooldown indicators specifically.
 */
const meta = {
  title: "Design System/Badge",
  component: Badge,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Full: Story = { args: { children: "Full", variant: "full" } };
export const Info: Story = { args: { children: "Info", variant: "info" } };
export const Success: Story = { args: { children: "Success", variant: "success" } };
export const Muted: Story = { args: { children: "Muted", variant: "muted" } };
export const StatusReady: Story = { args: { children: "Ready", variant: "statusReady" } };
export const StatusCooldown: Story = { args: { children: "Cooldown", variant: "statusCooldown" } };
