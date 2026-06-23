import { useState } from "react";
import type { InventoryColumnId, InventoryTablePrefs } from "../../../../shared/types";
import {
  DEFAULT_VISIBLE_INVENTORY_COLUMNS,
  INVENTORY_COLUMN_IDS,
  normalizeInventoryTablePrefs,
} from "../../../core/inventory/columnPrefs";
import { Popover } from "../../design-system/primitives/Popover/Popover";
import { Button } from "../../design-system/primitives/Button/Button";
import { Checkbox } from "../../design-system/primitives/Checkbox/Checkbox";

const COLUMN_LABELS: Record<InventoryColumnId, string> = {
  grade: "Grade",
  level: "Level",
  type: "Type",
  location: "Location",
  inUse: "Equipped",
  marketPrice: "Market price",
  listValue: "Market total",
  instantSell: "Instant sell",
  instantTotal: "Instant total",
  instantSellAverage: "Instant avg",
};

export interface InventoryColumnPickerProps {
  prefs: InventoryTablePrefs;
  onChange: (prefs: InventoryTablePrefs) => void;
}

export function InventoryColumnPicker({ prefs, onChange }: InventoryColumnPickerProps) {
  const [open, setOpen] = useState(false);
  const normalized = normalizeInventoryTablePrefs(prefs);
  const visible = new Set(normalized.visibleColumns);

  function toggle(id: InventoryColumnId, checked: boolean): void {
    const next = checked
      ? [...normalized.visibleColumns, id]
      : normalized.visibleColumns.filter((col) => col !== id);
    onChange(normalizeInventoryTablePrefs({ visibleColumns: next }));
  }

  function reset(): void {
    onChange({ visibleColumns: [...DEFAULT_VISIBLE_INVENTORY_COLUMNS] });
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      aria-label="Visible columns"
      trigger={
        <Button size="sm" type="button">
          Edit columns
        </Button>
      }
    >
      <div className="mb-2 flex flex-col gap-1.5">
        {INVENTORY_COLUMN_IDS.map((id) => (
          <Checkbox
            key={id}
            label={COLUMN_LABELS[id]}
            checked={visible.has(id)}
            onCheckedChange={(checked) => toggle(id, checked)}
          />
        ))}
      </div>
      <Button size="sm" variant="ghost" className="w-full" onClick={reset}>
        Reset to default
      </Button>
    </Popover>
  );
}
