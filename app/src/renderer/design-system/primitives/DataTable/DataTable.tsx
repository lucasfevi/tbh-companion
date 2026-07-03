import type { ReactNode } from "react";
import { cn } from "../../lib/variants";

export interface DataTableColumn {
  label: string;
  align?: "left" | "right";
  /** Fixed column width (e.g. "88px"); omit to let the column size to its content. */
  width?: string;
}

const thClass =
  "sticky top-0 z-[1] whitespace-nowrap bg-panel px-3 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-muted";

/**
 * A real `<table>` — header and row columns are guaranteed to align, because
 * the browser sizes each column to its widest cell across the whole table
 * (header included). A CSS-grid header rendered as a sibling of CSS-grid rows
 * does NOT get this guarantee: each grid recomputes its own `auto` column
 * widths independently, so the header and the rows can (and did) drift out
 * of alignment. `children` must be `<tr>` elements (see {@link DataTableRow}).
 */
export function DataTable({
  columns,
  maxHeight,
  className,
  children,
}: {
  columns: DataTableColumn[];
  /** Fixed scroll-area height (e.g. "168px"); omit to let the table grow with its content. */
  maxHeight?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(maxHeight && "overflow-y-auto", className)}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <table className="w-full table-fixed border-collapse text-[13px]">
        <colgroup>
          {columns.map((col, i) => (
            <col key={i} style={col.width ? { width: col.width } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} className={cn(thClass, col.align === "right" && "text-right")}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export interface DataTableCell {
  content: ReactNode;
  align?: "left" | "right";
  className?: string;
}

export function DataTableRow({ index, cells }: { index: number; cells: DataTableCell[] }) {
  return (
    <tr className={index % 2 === 0 ? "bg-panel" : undefined}>
      {cells.map((cell, i) => (
        <td
          key={i}
          className={cn(
            "whitespace-nowrap px-3 py-2",
            cell.align === "right" && "text-right",
            cell.className,
          )}
        >
          {cell.content}
        </td>
      ))}
    </tr>
  );
}
