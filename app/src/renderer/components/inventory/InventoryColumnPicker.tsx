import { useState } from "react";
import type { InventoryColumnId, InventoryTablePrefs } from "../../../../shared/types";
import {
  DEFAULT_VISIBLE_INVENTORY_COLUMNS,
  INVENTORY_COLUMN_IDS,
  normalizeInventoryTablePrefs,
} from "../../../core/inventory/columnPrefs";
import { AnchoredPanel } from "../ui/AnchoredPanel";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";

const COLUMN_LABELS: Record<InventoryColumnId, string> = {
  grade: "Grade",
  level: "Level",
  type: "Type",
  location: "Location",
  inUse: "In use",
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
    <AnchoredPanel
      open={open}
      onOpenChange={setOpen}
      trigger={({ ref, onClick, ...aria }) => (
        <Button ref={ref} size="sm" type="button" onClick={onClick} {...aria}>
          Columns
        </Button>
      )}
    >
      <div className="mb-2 flex flex-col gap-1.5">
        {INVENTORY_COLUMN_IDS.map((id) => (
          <Field key={id} label={COLUMN_LABELS[id]} checkbox>
            <input
              type="checkbox"
              checked={visible.has(id)}
              onChange={(e) => toggle(id, e.target.checked)}
            />
          </Field>
        ))}
      </div>
      <Button size="sm" variant="ghost" className="w-full" onClick={reset}>
        Reset to default
      </Button>
    </AnchoredPanel>
  );
}
