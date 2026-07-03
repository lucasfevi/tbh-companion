import type { Meta, StoryObj } from "@storybook/react-vite";
import { DataTable, DataTableRow } from "./DataTable";

/**
 * A real `<table>` (not a CSS-grid header hack) — column widths are
 * guaranteed to match between the header and every row, because the browser
 * sizes each column from the widest cell across the whole table. Use `width`
 * on a column for a fixed pixel width (e.g. a "Time" column shared across
 * several Live-tab tables so they visually line up); omit it to let the
 * column size to its content. `maxHeight` caps the scroll area so a short
 * list is just short and a long list scrolls in a predictable frame.
 */
const meta = {
  title: "Design System/DataTable",
  component: DataTable,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof DataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

const ROWS = [
  { time: "10:14:24 PM", stage: "Torment 1-3", duration: "1m27s", xp: "+14.23M", gold: "+744.95K" },
  { time: "10:12:55 PM", stage: "Torment 1-3", duration: "1m28s", xp: "+14.70M", gold: "+710.26K" },
  { time: "10:11:25 PM", stage: "Torment 1-3", duration: "1m26s", xp: "+14.23M", gold: "+691.63K" },
];

export const Default: Story = {
  render: () => (
    <div className="w-[420px]">
      <DataTable
        maxHeight="168px"
        columns={[
          { label: "Time", width: "92px" },
          { label: "Stage" },
          { label: "Duration", align: "right", width: "72px" },
          { label: "XP", align: "right", width: "88px" },
          { label: "Gold", align: "right", width: "80px" },
        ]}
      >
        {ROWS.map((row, i) => (
          <DataTableRow
            key={i}
            index={i}
            cells={[
              { content: row.time, className: "whitespace-nowrap tabular-nums text-muted" },
              { content: row.stage },
              { content: row.duration, align: "right", className: "tabular-nums text-muted" },
              { content: row.xp, align: "right", className: "tabular-nums text-accent" },
              { content: row.gold, align: "right", className: "tabular-nums text-gold" },
            ]}
          />
        ))}
      </DataTable>
    </div>
  ),
  args: { columns: [], children: null },
};

export const Empty: Story = {
  render: () => (
    <div className="w-[420px] rounded-lg border border-border bg-card p-2.5 text-[13px] text-muted">
      No stage clears logged yet.
    </div>
  ),
  args: { columns: [], children: null },
};
