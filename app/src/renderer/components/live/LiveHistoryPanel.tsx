import type { ReactNode } from "react";
import { PanelSection } from "../../design-system/primitives/PanelSection/PanelSection";
import {
  DataTable,
  DataTableRow,
  type DataTableColumn,
} from "../../design-system/primitives/DataTable/DataTable";

export type { DataTableColumn as LiveHistoryColumn };
export { DataTableRow as LiveHistoryRow };

/** Fixed-height scrollable table (~4-5 rows), so a short list is just short and a long list scrolls in place. */
const FIXED_HEIGHT = "168px";

/** Shared "Time" column width across every Live-tab history table, so side-by-side panels line up. */
export const TIME_COLUMN_WIDTH = "108px";

/** A Live-tab history panel: boxed title chrome around a fixed-height {@link DataTable}. */
export function LiveHistoryPanel({
  title,
  columns,
  empty,
  children,
}: {
  title: ReactNode;
  columns: DataTableColumn[];
  empty?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PanelSection title={title} boxed>
      {empty ? (
        <div className="p-2.5 text-[13px] text-muted">{empty}</div>
      ) : (
        <DataTable columns={columns} maxHeight={FIXED_HEIGHT}>
          {children}
        </DataTable>
      )}
    </PanelSection>
  );
}
